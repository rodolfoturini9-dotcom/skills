import pages from '../netlify/functions/_generated/pages.mjs';

// Rotas HTML do aplicativo: servidas somente após validação da sessão pelo worker.
const PAGE_ROUTES:Record<string,string>={'/':'index.html','/index.html':'index.html','/legado':'index.html','/ficha-uti':'index.html','/ficha-uti/':'index.html','/ficha-uti/index.html':'ficha-uti/index.html','/ficha-uti-integrada.html':'ficha-uti-integrada.html'};
const assets={async fetch(request:Request){
 const page=PAGE_ROUTES[new URL(request.url).pathname];
 const html=page?(pages as Record<string,string>)[page]:undefined;
 return html?new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response('Página não encontrada',{status:404});
}};

// Variáveis de ambiente do servidor (Netlify) no formato esperado pelo worker.
export function serverEnv(db:unknown){
 return {DB:db,ACCESS_PASSWORD:process.env.ACCESS_PASSWORD||'',ACCESS_SESSION_SECRET:process.env.ACCESS_SESSION_SECRET||'',
  ANTHROPIC_API_KEY:process.env.ANTHROPIC_API_KEY||'',ANTHROPIC_MODEL:process.env.ANTHROPIC_MODEL||'',ANTHROPIC_FALLBACKS:process.env.ANTHROPIC_FALLBACKS||'',ANTHROPIC_BASE_URL:process.env.ANTHROPIC_BASE_URL||'',ASSETS:assets};
}
