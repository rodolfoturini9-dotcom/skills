import type {Evolution,Sheet} from './ICUContext';
import {FICHA_ROWS} from './fichaModel';

export type PrintFields={diagnoses:string;antecedents:string;summary:string;events:string;controls:string;systems:string;supports:string;devices:string;antibiotics:string;prophylaxis:string;physical:string;impression:string;plan:string;pending:string;exams:string;fastHug:string};

export const evolutionSections:[keyof PrintFields,string][]=[
 ['diagnoses','Diagnósticos e hipóteses'],['antecedents','Antecedentes'],['summary','Resumo clínico e últimas 24 horas'],
 ['events','Intercorrências'],['controls','Controles e balanço hídrico'],['systems','Avaliação por sistemas'],
 ['supports','Suportes atuais'],['devices','Dispositivos'],['antibiotics','Antimicrobianos'],
 ['prophylaxis','Profilaxias'],['physical','Exame físico'],['exams','Exames complementares'],
 ['impression','Impressão clínica'],['plan','Condutas'],['fastHug','FAST-HUG'],['pending','Metas e pendências'],
];

export function formatEvolutionPrint(print:PrintFields,patient:string,bed:string,date:string){
 return [`DATA: ${date} | LEITO: ${bed} | PACIENTE: ${patient}`,...evolutionSections.filter(([key])=>print[key]?.trim()).map(([key,label])=>`# ${label.toUpperCase()}\n${print[key].trim()}`)].join('\n\n');
}

export function StructuredEvolution({print}:{print:PrintFields}){
 const sections=evolutionSections.filter(([key])=>print[key]?.trim());
 return <div className="icu-evolution-sections" role="list">{sections.map(([key,label])=>{
  const content=print[key].trim();
  return <section className="icu-evolution-section" role="listitem" key={key} aria-label={label}><h4>{label}</h4><p>{content}</p></section>;
 })}</div>;
}

export function EvolutionHistory({records,currentDate}:{records:Evolution[];currentDate:string}){
 const history=records.filter(record=>record.evolutionDate!==currentDate).sort((a,b)=>b.evolutionDate.localeCompare(a.evolutionDate));
 if(!history.length)return null;
 return <details className="icu-card icu-evolution-history"><summary>Histórico de evoluções <span>{history.length}</span></summary><div>{history.map(record=>{
  let print:PrintFields|null=null;
  if(record.printJson){try{print=JSON.parse(record.printJson) as PrintFields}catch{}}
  return <details key={record.id} className="icu-history-day"><summary>{record.evolutionDate.split('-').reverse().join('/')} · Evolução registrada</summary><div>{print&&<StructuredEvolution print={print}/>}<details className="icu-original-text"><summary>Texto original preservado</summary><pre>{record.text}</pre></details></div></details>;
 })}</div></details>;
}

const reviewGroups:[string,number[]][]=[
 ['Dispositivos e acessos',[0,1,2]],['Sinais vitais',[13,14,15,16,17]],
 ['Ventilação',[31,32,33]],['Drogas vasoativas e sedação',[23,24,25,26,27,28,29]],
 ['Antimicrobianos',[19,20,21,22]],['Balanço e função renal',[3,7,8,9,10,12,43,44]],
 ['Gasometria',[34,35,36,37]],['Hemograma e coagulação',[38,39,40,41,42]],
];
export function ClinicalSnapshot({sheet,day}:{sheet:Sheet|null;day:number}){
 if(!sheet)return null;
 return <details className="icu-card icu-evolution-facts"><summary>Conferência rápida da ficha · D{day+1} <span>Somente valores registrados</span></summary><div className="icu-facts-grid">{reviewGroups.map(([title,rows])=>{
  const values=rows.flatMap(row=>Array.from({length:FICHA_ROWS[row].single?1:2},(_,slot)=>{
   const value=sheet.cells[`${day}:${row}:${slot}`]?.trim();return value?`${FICHA_ROWS[row].labels[slot]||title}: ${value}`:'';
  }).filter(Boolean));
  return <section key={title}><h4>{title}</h4><p>{values.length?values.join(' · '):'Não preenchido na ficha'}</p></section>;
 })}</div></details>;
}
