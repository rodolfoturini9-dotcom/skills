// Compatibilidade do nome do módulo do ZIP: produção utiliza o backend OpenAI existente.
import {requestClinicalAI} from './productionAI.js';
export * from './evolucaoSchema.js';
export class EvolucaoError extends Error{}
export async function gerarEvolucao(bed,{signal,date}={}){
 const result=await requestClinicalAI('evolution',[bed],{signal,date:date||bed.evolutionDate||bed.dates[0]});return result.evolution;
}
