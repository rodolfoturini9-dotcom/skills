'use client';
import {useEffect,useRef,useState} from 'react';
import {useICU,latestDay,type Patient,type Evolution} from './ICUContext';
import {fromBr} from './fichaModel';
import {ClinicalSnapshot,EvolutionHistory,StructuredEvolution,formatEvolutionPrint,type PrintFields} from './EvolutionView';
import PrintPortal from './PrintPortal';

type Generated={text:string;sourceText:string;print:PrintFields;date:string;sourceVersion:number};
const left=[['diagnoses','Diagnósticos atuais'],['antecedents','Antecedentes'],['summary','Resumo da internação e últimas 24h'],['events','Eventos 24h'],['controls','Controles 24h'],['exams','Exames complementares'],['systems','Avaliação por sistemas']] as const;
const right=[['supports','Suportes atuais'],['devices','Dispositivos'],['antibiotics','Antimicrobianos'],['prophylaxis','Profilaxias'],['physical','Exame físico'],['impression','Impressão clínica'],['plan','Condutas'],['fastHug','FAST-HUG'],['pending','Metas e pendências']] as const;
const readDraft=(patientId:string,iso:string,fallback:string)=>{try{return typeof window==='undefined'?fallback:sessionStorage.getItem(`uti-evolution-draft:${patientId}:${iso}`)??fallback}catch{return fallback}};
const storedPreview=(record:Evolution|undefined,draft:string,name:string,bed:string):Generated|null=>{if(!record?.printJson||record.text!==draft)return null;try{const print=JSON.parse(record.printJson) as PrintFields,date=record.evolutionDate.split('-').reverse().join('/');return {text:formatEvolutionPrint(print,name,bed,date),sourceText:record.text,print,date,sourceVersion:record.sourceVersion||0}}catch{return null}};
export default function EvolutionEditor({patient}:{patient:Patient}){
 const {snapshot,sheets,mutate}=useICU(),entry=sheets[patient.id];
 const [day,setDay]=useState(()=>Math.max(0,latestDay(entry?.sheet||null)));
 const windowStart=Math.max(0,day-5);
 const date=entry?.sheet?.dates[day]||'';
 const iso=fromBr(date);
 const record=snapshot.evolutions.find(e=>e.patientId===patient.id&&e.evolutionDate===iso);
 const saved=record?.text||'';
 const [draft,setDraft]=useState(()=>readDraft(patient.id,iso,saved)),[generated,setGenerated]=useState<Generated|null>(()=>storedPreview(record,readDraft(patient.id,iso,saved),patient.name,patient.bed)),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[doctor,setDoctor]=useState(''),[crm,setCrm]=useState(''),[printExpanded,setPrintExpanded]=useState(false);
 const page=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),editor=useRef<HTMLTextAreaElement>(null);
 const chooseDay=(next:number)=>{const date=fromBr(entry?.sheet.dates[next]||'');const prior=snapshot.evolutions.find(e=>e.patientId===patient.id&&e.evolutionDate===date);const text=readDraft(patient.id,date,prior?.text||'');setDay(next);setDraft(text);setGenerated(storedPreview(prior,text,patient.name,patient.bed));setStatus('');};
 useEffect(()=>{const el=editor.current;if(!el)return;el.style.height='auto';el.style.height=`${Math.min(Math.max(el.scrollHeight,220),Math.max(360,window.innerHeight*.7))}px`;},[draft,day]);
 useEffect(()=>{const cleanup=()=>{delete document.body.dataset.evolutionPrint;setPrintExpanded(false)};window.addEventListener('afterprint',cleanup);return()=>{window.removeEventListener('afterprint',cleanup);delete document.body.dataset.evolutionPrint};},[]);
 const edit=(value:string)=>{setDraft(value);setGenerated(null);try{sessionStorage.setItem(`uti-evolution-draft:${patient.id}:${iso}`,value)}catch{}};
 async function generate(){if(!entry||!date)return;setBusy(true);setStatus(draft.trim()?'Organizando texto clínico com IA…':'Gerando evolução a partir da ficha salva…');try{
  const response=await fetch('/api/evolution/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientId:patient.id,day,version:entry.version,...(draft.trim()?{sourceText:draft}: {})})});
  const value=await response.json() as Generated&{error?:string};if(!response.ok)throw Error(value.error||'Falha na geração.');
  if(!draft.trim()){setDraft(value.text);try{sessionStorage.setItem(`uti-evolution-draft:${patient.id}:${iso}`,value.text)}catch{}}
  setGenerated({...value,sourceText:draft.trim()||value.text});setStatus('Evolução organizada para revisão. O texto original permanece no campo de entrada.');
 }catch(e){setStatus(e instanceof Error?e.message:'Falha na geração.')}finally{setBusy(false)}}
 async function save(){setBusy(true);const organized=!!generated&&generated.sourceText===draft;try{await mutate({action:'saveEvolution',patientId:patient.id,evolutionDate:iso,text:draft,...(organized?{print:generated.print,sourceVersion:generated.sourceVersion}:{})});try{sessionStorage.removeItem(`uti-evolution-draft:${patient.id}:${iso}`)}catch{}setStatus(organized?'Evolução salva. A passagem de plantão refletirá as seções revisadas.':'Texto original salvo. Organize com IA e revise as seções para atualizar a passagem.');}catch(e){setStatus(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}}
 async function print(){if(!generated||draft!==generated.sourceText){setStatus('Organize novamente a evolução após editar o texto.');return;}
  const outer=page.current,inner=content.current;if(!outer||!inner)return;
  inner.style.transform='none';const scale=Math.min(1,outer.clientWidth/Math.max(inner.scrollWidth,1),outer.clientHeight/Math.max(inner.scrollHeight,1))*.985;
  if(scale<.68){setPrintExpanded(true);setStatus('Texto extenso: impressão em páginas A4 adicionais, preservando o conteúdo integral.');await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())))}
  else{setPrintExpanded(false);inner.style.transform=`scale(${scale})`;setStatus('Evolução pronta para impressão em uma página A4.');}
  document.body.dataset.evolutionPrint='true';window.print();}
 return <section className="icu-evolution">
  <ClinicalSnapshot sheet={entry?.sheet||null} day={day}/>
  <div className="icu-evolution-workspace"><div className="icu-card icu-editor icu-evolution-entry">
   <div className="icu-ficha-head"><div><strong>Evolução médica</strong><small>Registro do Dia {day+1} · {date||'defina a data na ficha'}</small></div></div>
   <div className="icu-day-navigation"><button type="button" disabled={windowStart===0} onClick={()=>chooseDay(Math.max(0,day-6))}>Dias anteriores</button><span>D{windowStart+1} a D{windowStart+6}</span><button type="button" disabled={day>=Math.max(0,latestDay(entry?.sheet||null))} onClick={()=>chooseDay(Math.max(0,latestDay(entry?.sheet||null)))}>Mais recente</button></div>
   <div className="icu-day-tabs" role="tablist" aria-label="Dia da evolução">{Array.from({length:6},(_,i)=>{const index=windowStart+i;return <button type="button" key={index} role="tab" aria-selected={day===index} className={day===index?'active':''} disabled={index>=(entry?.sheet.dates.length||6)} onClick={()=>chooseDay(index)}>D{index+1}<small>{entry?.sheet.dates[index]?.slice(0,5)||'—'}</small></button>})}</div>
   <label className="icu-evolution-input">Texto único da evolução<textarea ref={editor} rows={9} maxLength={30000} value={draft} onChange={e=>edit(e.target.value)} placeholder="Digite ou cole a evolução clínica. Preserve datas, unidades e intercorrências. A IA organizará o texto para revisão."/></label>
   <div className="icu-actions"><button className="primary" disabled={!date||busy||!entry} onClick={()=>void generate()}>{busy?'Aguarde…':draft.trim()?'Organizar com IA':'Gerar da ficha com IA'}</button><button disabled={!draft.trim()||!iso||busy} onClick={()=>void save()}>{generated?'Salvar evolução e passagem':'Salvar texto original'}</button></div>
   <p role="status" className="icu-save-status">{status}</p>
  </div>
  <div className="icu-card icu-evolution-reading"><div className="icu-reading-heading"><div><span className="icu-overline">LEITURA CLÍNICA</span><h3>Evolução estruturada</h3><p>{generated?'Revise cada seção antes de utilizar na passagem ou na impressão.':'Insira o texto e selecione “Organizar com IA” para distribuir o conteúdo.'}</p></div>{generated&&<button type="button" className="icu-print-button" onClick={()=>void navigator.clipboard.writeText(generated.text).then(()=>setStatus('Texto organizado copiado.'),()=>setStatus('Falha ao copiar.'))}>Copiar texto</button>}</div>
   {generated?<><StructuredEvolution print={generated.print}/><details className="icu-original-text"><summary>Texto original preservado</summary><pre>{draft}</pre></details><div className="icu-evolution-print-actions"><div className="icu-two"><label>Nome do médico<input value={doctor} onChange={e=>setDoctor(e.target.value)} placeholder="Para assinatura"/></label><label>CRM<input value={crm} onChange={e=>setCrm(e.target.value)} placeholder="Para carimbo"/></label></div><button className="icu-print-button" onClick={()=>void print()}>Imprimir evolução A4</button></div></>:draft.trim()&&<div className="icu-unstructured-text"><strong>Texto para revisão</strong><p>{draft}</p></div>}
  </div><EvolutionHistory records={snapshot.evolutions.filter(e=>e.patientId===patient.id)} currentDate={iso}/></div>
  {generated&&<PrintPortal kind="evolution"><div className={`icu-evolution-print${printExpanded?' expanded':''}`} ref={page}><div ref={content} className="icu-evolution-print-content"><header><strong>HOSPITAL REGIONAL DE IVAIPORÃ</strong><h1>EVOLUÇÃO MÉDICA – UTI ADULTO</h1><p>Paciente: {patient.name} · Leito: {patient.bed} · Data: {generated.date}</p></header><div className="icu-evolution-columns">{[left,right].map((column,i)=><div key={i}>{column.map(([key,label])=>generated.print[key]?.trim()&&<section key={key}><h2>{label}</h2><p>{generated.print[key]}</p></section>)}</div>)}</div><footer>Data: {generated.date} · Hora: ______<br/>Assinatura e carimbo: {doctor} {crm&&`· CRM ${crm}`}</footer></div></div></PrintPortal>}
 </section>;
}
