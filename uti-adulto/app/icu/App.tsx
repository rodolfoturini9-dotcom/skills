'use client';

import {useMemo,useState} from 'react';
import Layout,{type MainTab} from './Layout';
import BottomSheet from './BottomSheet';
import {ICUProvider,useICU,type HandoffEntry} from './ICUContext';
import Handoff from './Handoff';
import EvolutionEditor from './EvolutionEditor';
import BedPlan from './BedPlan';
import Security from '../clinical/Security';
import Ficha from './Ficha';
import medicationData from '../medications.json';

type BedSection='ficha'|'evolucao'|'metas';
type Medication={id:number;name:string;text:string;weightBased:boolean;unit?:string;minDose?:number;maxDose?:number;concentration?:number;formula?:string;notes?:string};
const medications=medicationData as Medication[];
const beds=Array.from({length:10},(_,i)=>String(i+1).padStart(2,'0'));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const num=(s:string)=>{const n=Number(s.trim().replace(',','.'));return s.trim()&&Number.isFinite(n)?n:null};
const fmt=(n:number)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);

function PatientSummary({entry}:{entry:HandoffEntry}){
 const {patient,day,sheet}=entry;
 const pending=entry.tasks.filter(t=>!t.completed).length+entry.goals.filter(g=>!g.completed).length;
 const admission=(patient.icuAdmissionAt||patient.admissionAt||'').slice(0,10).split('-').reverse().join('/');
 return <div className="icu-summary"><div className="icu-patient-head"><span className="icu-patient-bed">LEITO {patient.bed}</span><div><span className="icu-overline">UTI ADULTO · PACIENTE</span><h2>{patient.name}</h2></div></div><dl className="icu-patient-meta"><div><dt>Admissão UTI</dt><dd>{admission||'Sem registro'}</dd></div><div><dt>Ficha</dt><dd>{day>=0?`D${day+1}${sheet?.dates[day]?` · ${sheet.dates[day]}`:''}`:'Pendente'}</dd></div><div><dt>Pendências</dt><dd>{pending}</dd></div></dl>{entry.diagnoses&&<div className="icu-patient-diagnosis"><span>DIAGNÓSTICOS / HIPÓTESES</span><p>{entry.diagnoses}</p></div>}</div>;
}

function Beds({onSupport}:{onSupport:()=>void}){
 const {handoff,selectedId,select,snapshot,sheets,refresh,mutate}=useICU();
 const [section,setSection]=useState<BedSection>('ficha'),[query,setQuery]=useState(''),[adding,setAdding]=useState(false),[newName,setNewName]=useState(''),[newBed,setNewBed]=useState(''),[date,setDate]=useState(today()),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const selected=snapshot.patients.find(p=>p.id===selectedId&&!p.archived)||null;
 const entry=handoff.find(e=>e.patient.id===selectedId);
 async function submit(body:Record<string,unknown>,success:string){setBusy(true);setMessage('');try{await mutate(body);setMessage(success);}catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setBusy(false);}}
 if(selected&&entry)return <section className="icu-bed">
  <button className="icu-back" onClick={()=>select(null)}>‹ Todos os leitos</button>
  <PatientSummary entry={entry}/>
  <div className="icu-segment" role="tablist" aria-label="Áreas do leito">{([['ficha','Ficha de 6 dias'],['evolucao','Evolução médica'],['metas','Condutas e metas']] as const).map(([id,label])=><button key={id} role="tab" aria-selected={section===id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}</div>
  {section==='ficha'&&(sheets[selected.id]?<Ficha key={selected.id} patient={selected}/>:<div className="icu-card"><p>Não foi possível carregar a ficha deste paciente.</p><button onClick={()=>void refresh()}>Tentar novamente</button></div>)}
  {section==='evolucao'&&<EvolutionEditor key={selected.id} patient={selected}/>}
  {section==='metas'&&<BedPlan key={selected.id} patient={selected} entry={entry}/>}
  <button className="icu-secondary-support" onClick={onSupport}>Abrir apoio e prescrição</button><p role="status" className="icu-status">{message}</p>
 </section>;
 const filtered=beds.filter(b=>!query||b.includes(query)||handoff.some(e=>e.patient.bed.padStart(2,'0')===b&&e.patient.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))));
 return <section><div className="icu-title"><div><span className="icu-overline">VISÃO GERAL · UTI ADULTO</span><h1>Leitos</h1><p>{handoff.length} em acompanhamento · {10-handoff.length} disponíveis</p></div><button className="icu-plus" onClick={()=>setAdding(v=>!v)}>{adding?'Fechar':'+ Paciente'}</button></div>
  {adding&&<form className="icu-card icu-new" onSubmit={async e=>{e.preventDefault();await submit({action:'createPatient',patient:{name:newName,bed:newBed,icuAdmissionAt:date}},'Paciente cadastrado.');setAdding(false);setNewName('');setNewBed('');}}><label>Nome<input value={newName} onChange={e=>setNewName(e.target.value)} required/></label><label>Leito<select value={newBed} onChange={e=>setNewBed(e.target.value)} required><option value="">Selecione</option>{beds.filter(b=>!handoff.some(e=>e.patient.bed.padStart(2,'0')===b)).map(b=><option key={b} value={b}>{b}</option>)}</select></label><label>Admissão na UTI<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="primary" disabled={busy||!newName.trim()||!newBed}>Cadastrar</button></form>}
  <label className="icu-search">Buscar nome ou leito<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome ou número do leito"/></label>
  <div className="icu-bed-grid">{filtered.map(b=>{const e=handoff.find(x=>x.patient.bed.padStart(2,'0')===b);const pending=e?e.tasks.filter(t=>!t.completed).length+e.goals.filter(g=>!g.completed).length:0;return <button className={`icu-bed-tile ${e?'occupied':'empty'}`} key={b} onClick={()=>{if(e){select(e.patient.id);setSection('ficha');}else{setNewBed(b);setAdding(true);}}}><span className="icu-bed-number">{b}</span><span className="icu-bed-text"><strong>{e?e.patient.name:'Leito disponível'}</strong><small>{e?`${e.date?`Último registro ${e.date.split('-').reverse().join('/')}`:'Ficha pendente'}${pending?` · ${pending} pendência(s)`:''}`:'Toque para cadastrar paciente'}</small></span><span className="icu-bed-end" aria-hidden="true">{e?'›':'+'}</span></button>})}</div>
  <p role="status" className="icu-status">{message}</p>
 </section>;
}

function Prescription(){const [query,setQuery]=useState(''),[chosen,setChosen]=useState<Medication|null>(null),[weight,setWeight]=useState(''),[dose,setDose]=useState(''),[copied,setCopied]=useState('');const options=useMemo(()=>medications.filter(m=>m.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).slice(0,12),[query]);
 const w=num(weight),d=num(dose),rate=chosen?.weightBased&&w&&d&&chosen.concentration?d*w*(chosen.formula?.endsWith('/min')?60:1)/chosen.concentration:null;
 const outside=chosen?.weightBased&&d!==null&&((chosen.minDose!=null&&d<chosen.minDose)||(chosen.maxDose!=null&&d>chosen.maxDose));
 const prescription=chosen?(chosen.weightBased&&rate!==null?`${chosen.text}\n# Dose prescrita: ${dose} ${chosen.unit}; ${fmt(rate)} mL/h\n# Faixa cadastrada: ${chosen.minDose??'mínimo não cadastrado'} a ${chosen.maxDose} ${chosen.unit}${outside?'\n# ALERTA: dose fora da faixa cadastrada. Revisão médica obrigatória antes do uso.':''}`:chosen.text):'';
 return <div className="icu-support-panel"><label>Buscar medicamento<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setChosen(null);}} placeholder="Nome do medicamento"/></label><div className="icu-med-options">{!chosen&&query&&options.map(m=><button key={m.id} onClick={()=>{setChosen(m);setQuery(m.name);setDose('');}}>{m.name}</button>)}</div>{chosen&&<><h3>{chosen.name}</h3><p>{chosen.text}</p>{chosen.weightBased&&<><div className="icu-two"><label>Peso (kg)<input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>Dose ({chosen.unit})<input inputMode="decimal" value={dose} onChange={e=>setDose(e.target.value)}/></label></div><p>Faixa cadastrada: {chosen.minDose} a {chosen.maxDose} {chosen.unit}</p>{outside&&<p className="icu-warning">Dose fora da faixa cadastrada; revise antes de utilizar.</p>}{rate!==null&&<output>Vazão calculada: {fmt(rate)} mL/h</output>}</>}<button className="primary" disabled={!!chosen.weightBased&&rate===null} onClick={()=>void navigator.clipboard.writeText(prescription).then(()=>setCopied('Prescrição copiada.'),()=>setCopied('Não foi possível copiar.'))}>Copiar prescrição</button><p role="status">{copied}</p></>}</div>;
}

function Calculators(){const [pas,setPas]=useState(''),[pad,setPad]=useState(''),[components,setComponents]=useState<string[]>(Array(6).fill(''));const s=num(pas),d=num(pad),scores=components.map(num),sofa=scores.every(x=>x!==null&&Number.isInteger(x)&&x>=0&&x<=4)?scores.reduce<number>((a,b)=>a+(b||0),0):null;
 return <div className="icu-support-panel"><h3>Pressão arterial média estimada</h3><div className="icu-two"><label>Pressão sistólica (mmHg)<input inputMode="decimal" value={pas} onChange={e=>setPas(e.target.value)}/></label><label>Pressão diastólica (mmHg)<input inputMode="decimal" value={pad} onChange={e=>setPad(e.target.value)}/></label></div><output>{s!==null&&d!==null&&s>=d&&d>=0?`${fmt((s+2*d)/3)} mmHg`:'Informe pressões válidas.'}</output><p>Estimativa aritmética; utilize a pressão média medida quando disponível.</p><h3>SOFA clássico</h3><p>Insira a pontuação manual de 0 a 4 de cada componente. O sistema apenas soma os valores informados.</p><div className="icu-two">{['Respiratório','Coagulação','Hepático','Cardiovascular','Neurológico','Renal'].map((label,i)=><label key={label}>{label}<input inputMode="numeric" value={components[i]} onChange={e=>setComponents(prev=>prev.map((v,j)=>j===i?e.target.value:v))}/></label>)}</div><output>{sofa===null?'Preencha os seis componentes (0–4).':`SOFA: ${sofa}/24`}</output></div>;
}

function Support({openSheet}:{openSheet:(x:'prescricao'|'calculadoras'|'backup')=>void}){return <section><div className="icu-title"><div><span className="icu-overline">FERRAMENTAS</span><h1>Apoio e prescrição</h1><p>Consulta rápida durante o plantão.</p></div></div><div className="icu-support-grid"><button onClick={()=>openSheet('prescricao')}><strong>Prescrição e diluições</strong><span>Busca, dose e texto para cópia</span><b aria-hidden="true">›</b></button><button onClick={()=>openSheet('calculadoras')}><strong>Calculadoras</strong><span>PAM estimada e SOFA manual</span><b aria-hidden="true">›</b></button><button onClick={()=>openSheet('backup')}><strong>Segurança e backup</strong><span>Exportar, restaurar e auditar</span><b aria-hidden="true">›</b></button></div></section>}

function Shell(){const {loading,error}=useICU(),[tab,setTab]=useState<MainTab>('leitos'),[sheet,setSheet]=useState<'prescricao'|'calculadoras'|'backup'|null>(null);
 return <Layout tab={tab} onTab={setTab}><div className="icu-screen">{error&&<p className="icu-warning" role="alert">{error}</p>}{loading?<p>Carregando leitos…</p>:tab==='leitos'?<Beds onSupport={()=>setSheet('prescricao')}/>:tab==='passagem'?<Handoff/>:<Support openSheet={setSheet}/>}</div><BottomSheet open={sheet!==null} title={sheet==='prescricao'?'Prescrição e diluições':sheet==='calculadoras'?'Calculadoras':'Segurança e backup'} onClose={()=>setSheet(null)}>{sheet==='prescricao'?<Prescription/>:sheet==='calculadoras'?<Calculators/>:sheet==='backup'?<Security/>:null}</BottomSheet></Layout>;
}
export default function App(){return <ICUProvider><Shell/></ICUProvider>}
