// Evolução por IA: geração no servidor com Claude (Anthropic), via fila de jobs.
import {requestClinicalAI} from './productionAI.js';
export * from './evolucaoSchema.js';
export class EvolucaoError extends Error{}
export async function gerarEvolucao(bed,{signal,date}={}){
 const result=await requestClinicalAI('evolution',[bed],{signal,date:date||bed.evolutionDate||bed.dates[0]});return result.evolution;
}
