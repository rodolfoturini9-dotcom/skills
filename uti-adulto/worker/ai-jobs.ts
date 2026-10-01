// Fila de execuções de IA. Funções síncronas do Netlify têm limite curto de execução; as gerações
// com Claude rodam em uma função de background (até 15 min) e o navegador acompanha pelo id do job.
import type {Database} from './db';
import {collectUsage, MODEL_PRICING} from './claude';

export const JOB_TTL_MS = 24 * 60 * 60 * 1000;
export const STALE_MS = 16 * 60 * 1000;

// Rotas que chamam a IA. /api/icu só é IA na ação analyzeClinicalText.
export function aiOperation(pathname: string, method: string, bodyText: string): string {
  if (method !== 'POST') return '';
  if (pathname === '/api/pep/ai') { try { return 'pep.' + (JSON.parse(bodyText).operation || 'desconhecida'); } catch { return 'pep'; } }
  if (pathname === '/api/ficha/interpret') return 'ficha.interpret';
  if (pathname === '/api/evolution/generate') return 'evolution.generate';
  if (pathname === '/api/ai/assistant') return 'assistant';
  if (pathname === '/api/ai/ping') return 'ping';
  if (pathname === '/api/icu') { try { return JSON.parse(bodyText).action === 'analyzeClinicalText' ? 'icu.analyze' : ''; } catch { return ''; } }
  return '';
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ai-job:' + value))), (b) => b.toString(16).padStart(2, '0')).join('');
}
export const jobSignature = hmac;
export async function verifyJobSignature(secret: string, id: string, signature: string) {
  const expected = await hmac(secret, id);
  if (typeof signature !== 'string' || signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export async function enqueueJob(db: Database, path: string, operation: string, bodyText: string) {
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await db.prepare('DELETE FROM ai_jobs WHERE created_at < ?').bind(new Date(Date.now() - JOB_TTL_MS).toISOString()).run();
  await db.prepare('INSERT INTO ai_jobs(id,path,operation,body,status,created_at) VALUES (?,?,?,?,?,?)').bind(id, path, operation, bodyText, 'queued', now).run();
  return id;
}

// Executa um job enfileirado uma única vez (a reivindicação é atômica) e grava o resultado.
export async function runJob(db: Database, id: string, handle: (request: Request) => Promise<Response>) {
  const claimed = await db.prepare("UPDATE ai_jobs SET status='running', started_at=? WHERE id=? AND status='queued'").bind(new Date().toISOString(), id).run();
  if (!claimed.meta.changes) return false;
  const job = await db.prepare('SELECT path,body FROM ai_jobs WHERE id=?').bind(id).first<{path: string; body: string}>();
  let status = 500, result = JSON.stringify({error: 'Falha na execução da IA.'}), model = '', inputTokens = 0, outputTokens = 0;
  try {
    const {value: response, usage} = await collectUsage(() => handle(new Request('https://job.internal' + job!.path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: job!.body})));
    status = response.status;
    result = await response.text();
    model = [...new Set(usage.map((u) => u.model))].join(', ');
    inputTokens = usage.reduce((n, u) => n + u.inputTokens, 0);
    outputTokens = usage.reduce((n, u) => n + u.outputTokens, 0);
  } catch (error) {
    console.error('ai.job.failed', JSON.stringify({id, name: error instanceof Error ? error.name : 'unknown'}));
  }
  await db.prepare("UPDATE ai_jobs SET status=?, http_status=?, result=?, body='', model=?, input_tokens=?, output_tokens=?, finished_at=? WHERE id=?")
    .bind(status < 400 ? 'done' : 'error', status, result, model, inputTokens, outputTokens, new Date().toISOString(), id).run();
  return true;
}

export async function readJob(db: Database, id: string) {
  const job = await db.prepare('SELECT id,operation,status,http_status,result,created_at,started_at,finished_at FROM ai_jobs WHERE id=?').bind(id).first<any>();
  if (!job) return null;
  const startedAt = Date.parse(job.started_at || job.created_at);
  if ((job.status === 'queued' || job.status === 'running') && Date.now() - startedAt > STALE_MS) {
    await db.prepare("UPDATE ai_jobs SET status='error', http_status=504, result=?, body='', finished_at=? WHERE id=? AND status IN ('queued','running')")
      .bind(JSON.stringify({error: 'A geração excedeu o tempo máximo. Tente novamente com menos conteúdo.'}), new Date().toISOString(), id).run();
    return readJob(db, id);
  }
  return {id: job.id, operation: job.operation, status: job.status, httpStatus: job.http_status, result: job.result, createdAt: job.created_at, startedAt: job.started_at, finishedAt: job.finished_at};
}

export async function usageReport(db: Database, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = (await db.prepare('SELECT operation,status,model,input_tokens,output_tokens,created_at,started_at,finished_at FROM ai_jobs WHERE created_at >= ? ORDER BY created_at DESC').bind(since).all<any>()).results;
  let cost = 0;
  for (const r of rows) for (const m of String(r.model || '').split(', ')) { const p = MODEL_PRICING[m]; if (p) { cost += (r.input_tokens * p.input + r.output_tokens * p.output) / 1e6; break; } }
  return {
    days, requests: rows.length,
    succeeded: rows.filter((r) => r.status === 'done').length,
    failed: rows.filter((r) => r.status === 'error').length,
    inputTokens: rows.reduce((n, r) => n + Number(r.input_tokens || 0), 0),
    outputTokens: rows.reduce((n, r) => n + Number(r.output_tokens || 0), 0),
    estimatedCostUSD: Math.round(cost * 100) / 100,
    recent: rows.slice(0, 20).map((r) => ({operation: r.operation, status: r.status, model: r.model, createdAt: r.created_at,
      seconds: r.finished_at && r.started_at ? Math.round((Date.parse(r.finished_at) - Date.parse(r.started_at)) / 1000) : null})),
  };
}
