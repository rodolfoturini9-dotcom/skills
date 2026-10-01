import worker from '../../worker/index';
import {getDatabase} from '../../server/database.mjs';
import pages from './_generated/pages.mjs';

// Rotas HTML do aplicativo: servidas somente após validação da sessão pelo worker.
const PAGE_ROUTES:Record<string,string>={'/':'index.html','/index.html':'index.html','/legado':'index.html','/ficha-uti':'index.html','/ficha-uti/':'index.html','/ficha-uti/index.html':'ficha-uti/index.html','/ficha-uti-integrada.html':'ficha-uti-integrada.html'};
const assets={async fetch(request:Request){
 const page=PAGE_ROUTES[new URL(request.url).pathname];
 const html=page?(pages as Record<string,string>)[page]:undefined;
 return html?new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response('Página não encontrada',{status:404});
}};

export default async function(request:Request){
 let db;
 try{db=await getDatabase();}
 catch(error){console.error('uti.database.unavailable',error instanceof Error?error.name:'unknown');return new Response('Banco de dados indisponível. Verifique o Netlify Database do site.',{status:503,headers:{'Cache-Control':'no-store'}});}
 const env={DB:db,ACCESS_PASSWORD:process.env.ACCESS_PASSWORD||'',ACCESS_SESSION_SECRET:process.env.ACCESS_SESSION_SECRET||'',OPENAI_API_KEY:process.env.OPENAI_API_KEY||'',ASSETS:assets};
 return worker.fetch(request,env as any,{waitUntil:()=>{},passThroughOnException:()=>{}});
}
export const config={path:['/','/index.html','/legado','/ficha-uti','/ficha-uti/','/ficha-uti/index.html','/ficha-uti-integrada.html','/api/*','/auth/*']};
