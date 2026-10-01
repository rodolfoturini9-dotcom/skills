import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from '../../worker/index';
import {getDatabase} from '../../server/database.mjs';
export default async function(request:Request){
 try {
 const env:any={DB:getDatabase(),ACCESS_PASSWORD:process.env.ACCESS_PASSWORD,ACCESS_SESSION_SECRET:process.env.ACCESS_SESSION_SECRET,OPENAI_API_KEY:process.env.OPENAI_API_KEY,ASSETS:{async fetch(req:Request){
 const pathname=decodeURIComponent(new URL(req.url).pathname);
 const root=path.resolve('dist');
 const target=path.resolve(root,['/','/legado','/ficha-uti','/ficha-uti/'].includes(pathname)?'index.html':'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(target!==root&&!target.startsWith(root+path.sep))return new Response('Acesso negado',{status:403});
 try {return new Response(await readFile(target),{headers:{'Content-Type':target.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'}});}catch{return new Response('Página não encontrada',{status:404});}
 }}};
 return await worker.fetch(request,env,{waitUntil:()=>{},passThroughOnException:()=>{}});
 }catch {return new Response('Configure o banco e as variáveis de ambiente conforme LEIA-ME-NETLIFY.md.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export const config={path:['/','/legado','/ficha-uti','/api/*','/auth/*','/ficha-uti/*','/ficha-uti-integrada.html']};
