'use client';
import {useRef,useState} from 'react';
import {useICU,latestDay,type Patient,type HandoffEntry} from './ICUContext';
import {fromBr} from './fichaModel';

type ContextField='diagnoses'|'medicalHistory'|'summary';
const fields:{key:ContextField;label:string;hint:string}[]=[
 {key:'diagnoses',label:'Diagnósticos e hipóteses',hint:'Preserve o grau de certeza registrado.'},
 {key:'medicalHistory',label:'Antecedentes / HMP',hint:'Apenas antecedentes documentados.'},
 {key:'summary',label:'Resumo clínico / HMA',hint:'Síntese datada da internação, sem duplicar valores da ficha.'},
];
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export default function BedPlan({patient,entry}:{patient:Patient;entry:HandoffEntry}){
 const {snapshot,mutate,refresh}=useICU();
 const [date,setDate]=useState(()=>fromBr(entry.sheet?.dates[latestDay(entry.sheet)]||'')||today());
 const [context,setContext]=useState<Record<ContextField,string>>({diagnoses:patient.diagnoses||'',medicalHistory:patient.medicalHistory||'',summary:patient.summary||''});
 const [goal,setGoal]=useState(''),[task,setTask]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const stamp=useRef(patient.updatedAt),saved=useRef<Record<ContextField,string>>({...context}),queue=useRef<Promise<void>>(Promise.resolve());
 const timers=useRef<Partial<Record<ContextField,ReturnType<typeof setTimeout>>>>({});
 const saveField=(field:ContextField,text:string)=>{const value=text.trim();if(saved.current[field]===value)return;
  setStatus('Salvando contexto clínico…');
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   if(saved.current[field]===value)return;
   const response=await fetch('/api/icu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'updateBedContext',patientId:patient.id,field,value,expectedUpdatedAt:stamp.current})});
   const result=await response.json() as {error?:string;updatedAt?:string};
   if(!response.ok||!result.updatedAt)throw Error(result.error||'Falha ao salvar o contexto.');
   stamp.current=result.updatedAt;saved.current[field]=value;
   await refresh();setStatus('Contexto salvo.');
  }).catch(e=>setStatus(e instanceof Error?e.message:'Falha ao salvar.'));
 };
 const changeField=(field:ContextField,value:string)=>{setContext(current=>({...current,[field]:value}));if(timers.current[field])clearTimeout(timers.current[field]);timers.current[field]=setTimeout(()=>saveField(field,value),650);};
 async function add(kind:'goal'|'task'){
  const value=(kind==='goal'?goal:task).trim();if(!value||busy)return;setBusy(true);setStatus('');
  try{await mutate(kind==='goal'?{action:'addDailyGoal',patientId:patient.id,goalDate:date,text:value}:{action:'addTask',patientId:patient.id,dueAt:date,text:value,priority:'normal'});if(kind==='goal')setGoal('');else setTask('');setStatus(kind==='goal'?'Meta registrada.':'Pendência registrada.');}
  catch(e){setStatus(e instanceof Error?e.message:'Não foi possível registrar.')}finally{setBusy(false)}
 }
 async function toggle(kind:'goal'|'task',id:number,completed:boolean){try{await mutate({action:kind==='goal'?'toggleDailyGoal':'toggleTask',id,completed});setStatus('Checklist atualizado.')}catch(e){setStatus(e instanceof Error?e.message:'Falha ao atualizar.')}}
 const goals=snapshot.dailyGoals.filter(g=>g.patientId===patient.id&&g.goalDate===date);
 const tasks=snapshot.tasks.filter(t=>t.patientId===patient.id&&(!t.completed||!!t.completedAt?.startsWith(date)));
 return <section className="icu-bed-plan">
  <div className="icu-card icu-editor"><h3>Contexto clínico do leito</h3>{fields.map(item=><label key={item.key}>{item.label}<textarea rows={item.key==='summary'?4:2} value={context[item.key]} maxLength={10000} onChange={e=>changeField(item.key,e.target.value)} onBlur={e=>{if(timers.current[item.key])clearTimeout(timers.current[item.key]);saveField(item.key,e.target.value)}} placeholder={item.hint}/></label>)}<p className="icu-context-note">Sinais vitais, suportes e exames são preenchidos na Ficha de 6 dias.</p></div>
  <div className="icu-card icu-editor"><h3>Condutas e metas</h3><label>Data<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Nova meta<textarea rows={2} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Uma meta objetiva por item"/></label><button className="primary" disabled={!date||!goal.trim()||busy} onClick={()=>void add('goal')}>Adicionar meta</button><div className="icu-checklist">{goals.map(g=><label key={g.id}><input type="checkbox" checked={g.completed} onChange={()=>void toggle('goal',g.id,!g.completed)}/><span>{g.text}</span></label>)}{!goals.length&&<p>Sem metas registradas nesta data.</p>}</div></div>
  <div className="icu-card icu-editor"><h3>Pendências do plantão</h3><label>Nova pendência<textarea rows={2} value={task} onChange={e=>setTask(e.target.value)} placeholder="Ex.: conferir resultado às 16h"/></label><button className="primary" disabled={!date||!task.trim()||busy} onClick={()=>void add('task')}>Adicionar pendência</button><div className="icu-checklist">{tasks.map(t=><label key={t.id}><input type="checkbox" checked={t.completed} onChange={()=>void toggle('task',t.id,!t.completed)}/><span>{t.text}</span></label>)}{!tasks.length&&<p>Sem pendências ativas.</p>}</div></div>
  <p className="icu-save-status" role="status">{status}</p>
 </section>;
}
