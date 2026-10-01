import {mergeDailyRecords} from './dailyHistory.js';
import {FICHA_ROWS,slotsOf,cellKey,isoToBR} from './icuStore.js';
export function clinicalDate(value) {
 const raw=String(value??'').trim();const br=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
 const iso=br?`${br[3]}-${br[2]}-${br[1]}`:raw;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw new Error('Data ausente ou inválida; use dd/mm/aaaa.');
 const date=new Date(iso+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==iso)throw new Error(`Data inválida: ${raw}.`);
 return iso;
}
export function parseAiJson(text) {
 let s=String(text??'').trim();const f=s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);if(f)s=f[1];
 let data;try{data=JSON.parse(s);}catch{throw new Error('JSON inválido. Cole o JSON puro ou a caixa de código Markdown.');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Resposta incompatível: esperado objeto JSON.');return data;
}
export function planFichaImport(bed,data) {
 if(!Array.isArray(data.days)||!data.days.length)throw new Error('Nenhum dia foi informado.');
 const dates=[...bed.dates],cells={...bed.cells},conflicts=[],warnings=[],changes=[],byDate=new Map();
 dates.forEach((v,i)=>{if(v){const d=clinicalDate(v);if(byDate.has(d))throw new Error('A mesma data já está registrada em duas colunas. Corrija a ficha.');byDate.set(d,i);}});
 const occupied=dates.map((date,d)=>!!date||Object.keys(cells).some(k=>k.startsWith(`${d}:`)));
 const seen=new Set(),newDates=new Set(),updatedDates=new Set();let lastTarget=0;
 const patch={};
 for(const [incoming,field,label] of [['patient','patientName','paciente'],['admission','admissionDate','admissão'],['bed','bedId','leito']]){
  let value=data[incoming];if(value==null||value==='')continue;if(typeof value!=='string'&&typeof value!=='number')throw new Error(`Identificação inválida: ${label}.`);
  value=String(value).trim();if(!value)continue;
  if(incoming==='admission')value=clinicalDate(value);
  if(incoming==='bed')value=value.replace(/^0+(?=\d)/,'').padStart(2,'0');
  const current=String(bed[field]||'').trim();
  if(current&&current.toLocaleLowerCase('pt-BR')!==value.toLocaleLowerCase('pt-BR'))conflicts.push(label);
  else if(!current&&field!=='bedId')patch[field]=value;
 }
 for(const [index,day] of data.days.entries()) {
  if(!day||typeof day!=='object'||Array.isArray(day))throw new Error(`Dia ${index+1} inválido.`);
  const date=clinicalDate(day.date);if(seen.has(date))throw new Error(`Data repetida na resposta: ${isoToBR(date)}.`);seen.add(date);
  let target=byDate.get(date);
  if(target===undefined){target=occupied.findIndex(v=>!v);if(target<0)throw new Error('A folha comporta seis dias. Inicie a próxima ficha preservando o histórico antes de adicionar datas novas.');dates[target]=date;occupied[target]=true;byDate.set(date,target);newDates.add(date);for(const [k,v]of Object.entries(mergeDailyRecords(bed)[date]?.cells||{}))cells[target+':'+k]=v;}else updatedDates.add(date);
  lastTarget=target;
  if(!day.cells||typeof day.cells!=='object'||Array.isArray(day.cells))throw new Error(`Campos inválidos no dia ${isoToBR(date)}.`);
  for(const [raw,val] of Object.entries(day.cells)) {
   const row=Number(raw);
   if(!/^\d+$/.test(raw)||!FICHA_ROWS[row]){warnings.push(`Linha ${raw} ignorada.`);continue;}
   if(!slotsOf(row).length){warnings.push(`Linha ${row} é espaço em branco e foi ignorada.`);continue;}
   const values=Array.isArray(val)?val:[val];
   for(const slot of slotsOf(row)) {
    const value=values[slot];if(value==null||value==='')continue;
    if(typeof value!=='string'&&typeof value!=='number')throw new Error(`Valor incompatível na linha ${row}, campo ${slot+1}.`);
    const text=String(value).trim();if(!text)continue;
    const key=cellKey(target,row,slot),before=cells[key]||'';
    if(text!==before)changes.push({date,target,row,slot,before,after:text});cells[key]=text;
   }
  }
 }
 return {patch:{...patch,dates,cells},conflicts,warnings:[...new Set(warnings)],changes,newCount:newDates.size,updatedCount:updatedDates.size,lastTarget};
}
