import worker from '../../worker/index';
import {jobSignature} from '../../worker/ai-jobs';
import {getDatabase} from '../../server/database.mjs';
import {serverEnv} from '../../server/env';

export default async function(request:Request){
 let db;
 try{db=await getDatabase();}
 catch(error){console.error('uti.database.unavailable',error instanceof Error?error.name:'unknown');return new Response('Banco de dados indisponível. Verifique o Netlify Database do site.',{status:503,headers:{'Cache-Control':'no-store'}});}
 const env:any=serverEnv(db);
 // Jobs de IA: a função de background (até 15 min) executa a chamada ao Claude; a resposta 202 é imediata.
 env.AI_DISPATCH=async(jobId:string,original:Request)=>{
  const target=new URL('/.netlify/functions/ai-background',original.url);
  const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:jobId,signature:await jobSignature(env.ACCESS_SESSION_SECRET,jobId)})});
  if(response.status!==202&&!response.ok)throw new Error('Não foi possível iniciar a geração por IA ('+response.status+').');
 };
 return worker.fetch(request,env,{waitUntil:()=>{},passThroughOnException:()=>{}});
}
export const config={path:['/','/index.html','/legado','/ficha-uti','/ficha-uti/','/ficha-uti/index.html','/ficha-uti-integrada.html','/api/*','/auth/*']};
