import type {Database} from './db';
/** Cloudflare Worker entry point for the vinext-starter template. */


import { handleClinicalApi } from "./clinical-api";
import { handleIcuApi } from "./icu-api";
import { handleSheetApi, interpretSheet } from "./sheet-api";
import {handlePepApi} from './pep-api';
import {handlePepAI} from './pep-ai';
import { generateEvolution } from "./evolution-api";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> | Response };
  DB: Database;
  ACCESS_PASSWORD: string;
  ACCESS_SESSION_SECRET: string;
  OPENAI_API_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const SESSION_COOKIE = "hri_uti_session";
const SESSION_MAX_AGE = 60 * 60 * 12;

function loginPage(error = "", status = 200) {
  const errorBlock = error ? `<div class="error" role="alert">${error}</div>` : "";
  return new Response(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Acesso restrito · UTI Adulto</title>
  <style>
    *{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#0d292f,#123d47 58%,#0f5760);font-family:Arial,Helvetica,sans-serif;color:#17343a}.shell{width:min(440px,100%);background:#fff;border:1px solid rgba(255,255,255,.3);border-radius:22px;box-shadow:0 28px 80px rgba(2,18,22,.38);overflow:hidden}.brand{padding:28px 30px 23px;background:#f7faf9;border-bottom:1px solid #dce7e5}.brand small{display:block;margin-bottom:8px;color:#13746e;font-size:11px;font-weight:800;letter-spacing:.13em}.brand h1{margin:0;font-size:23px;line-height:1.2;letter-spacing:-.02em}.brand p{margin:7px 0 0;color:#63787c;font-size:13px;line-height:1.5}.content{padding:27px 30px 30px}.content label{display:grid;gap:8px;color:#455d62;font-size:13px;font-weight:700}.content input{width:100%;height:48px;padding:0 13px;border:1px solid #becfcd;border-radius:10px;background:#fff;color:#17343a;font-size:18px;letter-spacing:.08em}.content input:focus{outline:3px solid rgba(22,117,111,.2);border-color:#16756f}.content button{width:100%;height:48px;margin-top:14px;border:0;border-radius:10px;background:#16756f;color:#fff;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(22,117,111,.22)}.content button:hover{background:#0d5b57}.error{margin-bottom:14px;padding:10px 12px;border:1px solid #e6b8b6;border-radius:9px;background:#fff2f1;color:#8b3438;font-size:13px}.security{margin:16px 0 0;color:#718386;font-size:11px;line-height:1.5;text-align:center}@media(max-width:520px){body{padding:14px}.brand,.content{padding-left:21px;padding-right:21px}.brand h1{font-size:21px}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="brand"><small>HOSPITAL REGIONAL DE IVAIPORÃ</small><h1>UTI Adulto · Gestão de Plantão</h1><p>Acesso restrito ao sistema clínico.</p></header>
    <form class="content" method="post" action="/auth/login">
      ${errorBlock}
      <label>Senha de acesso<input name="password" type="password" autocomplete="current-password" autofocus required /></label>
      <button type="submit">Entrar no sistema</button>
      <p class="security">Sessão protegida por cookie seguro com duração máxima de 12 horas.</p>
    </form>
  </main>
</body>
</html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" } });
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function passwordMatches(candidate: string, expected: string) {
  const [candidateHash, expectedHash] = await Promise.all([digest(candidate), digest(expected)]);
  return equalBytes(candidateHash, expectedHash);
}

async function sessionId(token: string, secret: string) {
  return Array.from(await digest(token + secret), b => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

async function hasValidSession(request: Request, env: Env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return false;
  const id = await sessionId(token, env.ACCESS_SESSION_SECRET);
  const row = await env.DB.prepare("SELECT expires,last_seen FROM access_sessions WHERE id=?").bind(id).first<{expires:number;last_seen:number}>();
  const now = Date.now();
  if (!row || Number(row.expires) <= now || Number(row.last_seen) <= now - 15*60*1000) return false;
  if(request.method === "POST" || new URL(request.url).pathname === "/") await env.DB.prepare("UPDATE access_sessions SET last_seen=? WHERE id=?").bind(now,id).run();
  return true;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const baseWorker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Safari can serialize Origin as "null" after a no-referrer form page.
    // Accept that only when browser-controlled Fetch Metadata proves same-origin.
    // Explicit foreign origins and cross-site submissions remain rejected.
    const origin=request.headers.get("Origin");
    const fetchSite=request.headers.get("Sec-Fetch-Site");
    if(request.method === "POST" && (
      fetchSite === "cross-site" ||
      (origin && origin !== url.origin && !(origin === "null" && fetchSite === "same-origin"))
    )) return url.pathname === "/auth/login"
      ? loginPage("Não foi possível validar a origem do acesso. Abra o sistema em uma nova aba e tente novamente.",403)
      : Response.json({error:"Origem não permitida"},{status:403});
    const authConfigured = Boolean(env.ACCESS_PASSWORD && env.ACCESS_SESSION_SECRET);
    const localValidation = false;

    if (!authConfigured && !localValidation) {
      return new Response("Proteção de acesso não configurada.", { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    if (authConfigured && url.pathname === "/auth/login" && request.method === "POST") {
      const attemptId=await sessionId(request.headers.get("X-NF-Client-Connection-IP") || "shared",env.ACCESS_SESSION_SECRET);
      const now=Date.now();
      const attempt=await env.DB.prepare("SELECT attempts,reset_at FROM access_attempts WHERE id=?").bind(attemptId).first<{attempts:number;reset_at:number}>();
      if(attempt && Number(attempt.reset_at)>now && Number(attempt.attempts)>=10) return loginPage("Muitas tentativas. Aguarde 15 minutos.",429);
      const form = await request.formData();
      const password = String(form.get("password") || "");
      if (!(await passwordMatches(password, env.ACCESS_PASSWORD))) {
        await env.DB.prepare("INSERT INTO access_attempts(id,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN access_attempts.reset_at<=? THEN 1 ELSE access_attempts.attempts+1 END,reset_at=CASE WHEN access_attempts.reset_at<=? THEN ? ELSE access_attempts.reset_at END").bind(attemptId,now+900000,now,now,now+900000).run();
        return loginPage("Senha incorreta. Tente novamente.",401);
      }
      await env.DB.prepare("DELETE FROM access_attempts WHERE id=?").bind(attemptId).run();
      await env.DB.prepare("INSERT INTO clinical_audit(patient_id,action,author,at) VALUES ('','access.login','Usuário autenticado',?)").bind(new Date().toISOString()).run();
      await env.DB.prepare("DELETE FROM access_sessions WHERE expires<=? OR last_seen<=?").bind(now,now-900000).run();
      const token=crypto.randomUUID()+crypto.randomUUID();
      await env.DB.prepare("INSERT INTO access_sessions(id,expires,last_seen) VALUES (?,?,?)").bind(await sessionId(token,env.ACCESS_SESSION_SECRET),now+SESSION_MAX_AGE*1000,now).run();
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (authConfigured && url.pathname === "/auth/logout") {
      await env.DB.prepare("DELETE FROM access_sessions WHERE id=?").bind(await sessionId(cookieValue(request,SESSION_COOKIE),env.ACCESS_SESSION_SECRET)).run();
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/",
          "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (authConfigured && !(await hasValidSession(request, env))) return url.pathname.startsWith('/api/') ? Response.json({error:'Sessão expirada. Entre novamente.'},{status:401,headers:{'Cache-Control':'no-store'}}) : loginPage();
    if(url.pathname === '/api/session') return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
    if(url.pathname === '/api/clinical') return handleClinicalApi(request,env.DB);
    if(url.pathname === '/api/ficha/interpret' && request.method === 'POST') return interpretSheet(request,env.OPENAI_API_KEY || '');
    if(url.pathname === '/api/ficha') return handleSheetApi(request,env.DB);
    if(url.pathname === '/api/evolution/generate') return generateEvolution(request,env.DB,env.OPENAI_API_KEY || '');

    if(url.pathname === '/api/pep')return handlePepApi(request,env.DB);
    if(url.pathname === '/api/pep/ai')return handlePepAI(request,env.DB,env.OPENAI_API_KEY||'');
    if (url.pathname === "/api/icu") {
      return handleIcuApi(request, env.DB, env.OPENAI_API_KEY || "");
    }

    return env.ASSETS.fetch(request);
  },
};

const worker={async fetch(request:Request,env:Env,ctx:ExecutionContext){try{const response=await baseWorker.fetch(request,env,ctx);const secured=new Response(response.body,response);secured.headers.set('Cache-Control','no-store');secured.headers.set('X-Content-Type-Options','nosniff');secured.headers.set('Referrer-Policy','same-origin');secured.headers.set('X-Frame-Options',new URL(request.url).pathname==='/ficha-uti-integrada.html'?'SAMEORIGIN':'DENY');return secured;}catch{console.error('UTI request failed',JSON.stringify({method:request.method,path:new URL(request.url).pathname}));return Response.json({error:'Serviço indisponível. Tente novamente; suas alterações não foram confirmadas.'},{status:503,headers:{'Cache-Control':'no-store'}});}}};
export default worker;
