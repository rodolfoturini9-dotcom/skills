import {requestClinicalAI} from './productionAI.js';
import {HANDOFF_RULES,handoffSources,validateHandoffResponse} from '../core/handoffGeneration.js';
export async function generateHandoffAI(beds,{client,signal}={}){
 if(client){const msg=await client.messages.create({system:HANDOFF_RULES,tool_choice:{type:'tool',name:'preencher_passagem'},messages:[{role:'user',content:JSON.stringify(beds.map(handoffSources))}]},{signal});if(msg.stop_reason==='max_tokens')throw Error('Resposta incompleta.');const call=msg.content.find(c=>c.type==='tool_use'&&c.name==='preencher_passagem');if(!call)throw Error('Resposta inválida.');return validateHandoffResponse(JSON.stringify(call.input),beds);}
 const result=await requestClinicalAI('handoff',beds,{signal});return result.patients;
}
