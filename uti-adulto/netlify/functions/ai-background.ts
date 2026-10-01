// Função de background do Netlify (sufixo -background: até 15 minutos de execução).
// Executa um job de IA enfileirado pela função principal; aceita somente ids assinados com o segredo do servidor.
import {runQueuedJob} from '../../worker/index';
import {verifyJobSignature} from '../../worker/ai-jobs';
import {getDatabase} from '../../server/database.mjs';
import {serverEnv} from '../../server/env';

export default async function(request:Request){
 if(request.method!=='POST')return;
 const secret=process.env.ACCESS_SESSION_SECRET||'';
 let body:any;
 try{body=await request.json();}catch{return;}
 if(!secret||typeof body?.id!=='string'||!(await verifyJobSignature(secret,body.id,body.signature))){console.error('ai.background.rejected');return;}
 const env:any=serverEnv(await getDatabase());
 await runQueuedJob(body.id,env);
}
