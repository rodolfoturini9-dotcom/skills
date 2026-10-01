import {createInitialState,createEmptyBed,isoToBR,brToISO,BED_IDS,stayDays} from './icuStore.js';
import {mergeDailyRecords} from './dailyHistory.js';
import {evolutionFromText} from '../services/textEvolution.js';
const lines=x=>String(x||'').split('\n').filter(x=>x.trim());
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const dateOnly=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}/.test(x)?x.slice(0,10):brToISO(x)||'';
export const LEGACY_TABLES=['patients','daily_sheets','evolutions','tasks','daily_goals','clinical_records','custom_medications','events','medical_documents','prescribers'];
export function mapLegacy(source){
 const state={...createInitialState(),archivedEpisodes:{},legacyPreserved:source};
 for(const p of source.patients||[]){
  const id=String(p.bed).padStart(2,'0');
  const b={...createEmptyBed(id),patientId:p.id,episodeId:p.id,patientName:p.name,age:p.age,admissionDate:dateOnly(p.icu_admission_at),hospitalAdmissionDate:dateOnly(p.admission_at),status:p.archived?'occupied':p.status==='critico'?'critical':p.status==='isolamento'?'isolation':'occupied',isIsolation:p.status==='isolamento',legacyPatient:clone(p)};
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());b.dih=stayDays(b.hospitalAdmissionDate||b.admissionDate,today);b.diUti=stayDays(b.admissionDate,today);
  b.handoff={...b.handoff,diagnosticos:lines(p.diagnoses),antecedentes_historia:lines(p.medical_history),historia_atual:lines(p.summary),condutas:lines(p.today_goals),pendencias:lines(p.handoff)};
  b.handoff.checklist=(source.tasks||[]).filter(x=>x.patient_id===p.id).map(x=>({id:'legacy-task-'+x.id,texto:x.text,status:x.completed?'realizado':'pendente',legacyId:x.id}));
  const sheet=(source.daily_sheets||[]).find(x=>x.patient_id===p.id);
  if(sheet){const s=JSON.parse(sheet.data);const dates=s.dates.map(x=>brToISO(x)||x||'');
   dates.forEach((date,i)=>{if(date)b.dailyRecords[date]={date,cells:Object.fromEntries(Object.entries(s.cells).filter(([k])=>k.startsWith(i+':')).map(([k,v])=>[k.slice(k.indexOf(':')+1),v]))};});
   const start=Math.max(0,Math.floor(Math.max(0,dates.length-1)/6)*6);b.dates=Array.from({length:6},(_,i)=>dates[start+i]||'');
   b.cells=Object.fromEntries(Object.entries(s.cells).filter(([k])=>+k.split(':')[0]>=start&&+k.split(':')[0]<start+6).map(([k,v])=>{const [d,r,s]=k.split(':');return [`${+d-start}:${r}:${s}`,v];}));
   b.legacySheet={version:sheet.version,sourceText:s.sourceText||'',undated:clone(s)};
  }
  for(const e of (source.evolutions||[]).filter(x=>x.patient_id===p.id).sort((a,b)=>a.evolution_date.localeCompare(b.evolution_date))){const evo={...evolutionFromText(e.text),clinicalDate:e.evolution_date,geradoEm:e.created_at||e.updated_at,editadoEm:e.updated_at||e.created_at,legacyId:e.id};const r=b.dailyRecords[e.evolution_date]||{date:e.evolution_date,cells:{}};b.dailyRecords[e.evolution_date]={...r,evolution:evo,evolutionRevisions:[evo]};b.evolucao=evo;}
  b.legacyRecords=(source.clinical_records||[]).filter(x=>x.patient_id===p.id);
  b.legacyGoals=(source.daily_goals||[]).filter(x=>x.patient_id===p.id);
  // A data de criação não é convertida em data assistencial.
  b.legacyDocuments=(source.medical_documents||[]).filter(x=>x.patient_id===p.id);
  b.legacyEvents=(source.events||[]).filter(x=>x.patient_id===p.id);
  if(p.archived||!BED_IDS.includes(id)){b.archived=true;state.archivedEpisodes[p.id]=b;}
  else{if(state.beds[id].patientId)throw Error('Há duas internações ativas no mesmo leito. Reconciliação administrativa necessária.');state.beds[id]=b;}
 }
 state.legacyCatalog=clone(source.custom_medications||[]);
 return state;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Incorpora alterações feitas pelas APIs legadas sem apagar campos novos.
function mergeDiff(current,baseline,incoming,path=''){
 if(same(baseline,incoming))return current;
 if(path.endsWith('evolutionRevisions.')&&Array.isArray(incoming)&&Array.isArray(baseline)){if(same(baseline.map(x=>x.texto),incoming.map(x=>x.texto)))return current;return [...(current||[]),...incoming.filter(x=>!(current||[]).some(y=>y.texto===x.texto&&y.clinicalDate===x.clinicalDate))];}
 if(path.endsWith('evolution.')&&current?.texto===incoming?.texto)return current;
 if(path.endsWith('evolucao.')&&current?.texto===incoming?.texto)return current;
 if(same(current,baseline)||same(current,incoming))return clone(incoming);
 if(current&&baseline&&incoming&&typeof current==='object'&&!Array.isArray(current)&&typeof baseline==='object'&&!Array.isArray(baseline)&&typeof incoming==='object'&&!Array.isArray(incoming)){
  const result={...current};for(const k of new Set([...Object.keys(baseline),...Object.keys(incoming)])){if(k.startsWith('legacy')){result[k]=clone(incoming[k]??null);continue;}if(same(baseline[k],incoming[k]))continue;if(incoming[k]===undefined){if(same(current[k],baseline[k]))delete result[k];else throw Error('Conflito entre módulos em '+path+k);}else result[k]=mergeDiff(current[k],baseline[k],incoming[k],path+k+'.');}return result;
 }
 throw Error('Conflito entre módulos em '+path+'; revise as duas versões antes de salvar.');
}
export function reconcileLegacy(state,baseline,source){
 if(!baseline)return mapLegacy(source);
 const old=mapLegacy(baseline),next=mapLegacy(source);
 const result=mergeDiff(state,old,next);
 result.legacyPreserved=source;return result;
}
export function episodeEntries(state){return [...Object.values(state.beds).filter(b=>b.patientId),...Object.values(state.archivedEpisodes||{})];}
export function sheetOf(b){
 const records=mergeDailyRecords(b),dates=Object.keys(records).sort();
 // Preserva também colunas antigas sem data, sem lhes atribuir datas retroativas.
 const undated=b.legacySheet?.undated;const blanks=[];
 if(undated)undated.dates.forEach((d,i)=>{if(!d&&Object.keys(undated.cells).some(k=>k.startsWith(i+':')))blanks.push(i);});
 const allDates=[...dates,...blanks.map(()=>'' )];while(allDates.length<6)allDates.push('');
 const cells={};dates.forEach((date,d)=>{for(const [k,v] of Object.entries(records[date].cells||{}))cells[d+':'+k]=v;});
 blanks.forEach((old,i)=>{for(const [k,v]of Object.entries(undated.cells||{}))if(k.startsWith(old+':'))cells[(dates.length+i)+':'+k.slice(k.indexOf(':')+1)]=v;});
 return {patient:b.patientName,bed:b.bedId,admission:b.hospitalAdmissionDate||b.admissionDate||'',dates:allDates.map(isoToBR),cells,sourceText:b.legacySheet?.sourceText||''};
}
export function projectionForSync(state,source,now){
 const out=clone(source);const statements=[];
 for(const b of episodeEntries(state)){
  let p=out.patients.find(p=>p.id===b.patientId);
  if(!p){p={id:b.patientId,bed:b.bedId,name:b.patientName,age:b.age||'',admission_at:b.hospitalAdmissionDate||'',icu_admission_at:b.admissionDate||'',status:'atencao',archived:0,created_at:now,updated_at:now};out.patients.push(p);statements.push({sql:'INSERT INTO patients(id,bed,name,age,admission_at,icu_admission_at,status,archived,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?)',values:[p.id,p.bed,p.name,p.age,p.admission_at,p.icu_admission_at,p.status,p.archived,now,now]});}
  const patch={bed:b.bedId,name:b.patientName,age:b.age||'',admission_at:b.hospitalAdmissionDate===dateOnly(b.legacyPatient?.admission_at)?p.admission_at:b.hospitalAdmissionDate||'',icu_admission_at:b.admissionDate===dateOnly(b.legacyPatient?.icu_admission_at)?p.icu_admission_at:b.admissionDate||'',status:(b.status===(b.legacyPatient?.status==='critico'?'critical':b.legacyPatient?.status==='isolamento'?'isolation':'occupied')&&!!b.isIsolation===(b.legacyPatient?.status==='isolamento'))?p.status:b.status==='critical'?'critico':b.isIsolation?'isolamento':'atencao',archived:b.archived?1:0};
  if(Object.entries(patch).some(([k,v])=>p[k]!==v)){Object.assign(p,patch,{updated_at:now});statements.push({sql:'UPDATE patients SET bed=?,name=?,age=?,admission_at=?,icu_admission_at=?,status=?,archived=?,updated_at=? WHERE id=? AND EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?)',values:[...Object.values(patch),now,p.id]});}
  const sheet=sheetOf(b),oldSheet=out.daily_sheets.find(x=>x.patient_id===p.id);
  if(Object.keys(sheet.cells).length||sheet.dates.some(Boolean)||oldSheet){if(!oldSheet||!same(JSON.parse(oldSheet.data),sheet)){const row={patient_id:p.id,admission:sheet.admission,data:JSON.stringify(sheet),version:(oldSheet?.version||0)+1,updated_at:now,author:'Usuário autenticado'};out.daily_sheets=out.daily_sheets.filter(x=>x.patient_id!==p.id).concat(row);statements.push({sql:'INSERT INTO daily_sheets(patient_id,admission,data,version,updated_at,author) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?) ON CONFLICT(patient_id) DO UPDATE SET admission=excluded.admission,data=excluded.data,version=excluded.version,updated_at=excluded.updated_at,author=excluded.author',values:Object.values(row)});}}
  // Prescrições históricas só existem no snapshot: nunca recalcular ao sincronizar.
  for(const [date,r]of Object.entries(mergeDailyRecords(b))){if(!r.evolution?.texto)continue;let e=out.evolutions.find(e=>e.patient_id===p.id&&e.evolution_date===date);if(e?.text===r.evolution.texto)continue;if(!e){e={patient_id:p.id,evolution_date:date,text:r.evolution.texto,print_json:'',source_version:0,created_at:now,updated_at:now};out.evolutions.push(e);}else Object.assign(e,{text:r.evolution.texto,updated_at:now});statements.push({sql:'INSERT INTO evolutions(patient_id,evolution_date,text,print_json,source_version,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?) ON CONFLICT(patient_id,evolution_date) DO UPDATE SET text=excluded.text,updated_at=excluded.updated_at',values:[p.id,date,e.text,e.print_json||'',e.source_version||0,e.created_at,now]});}
  for(const c of b.handoff.checklist){if(!c.legacyId)continue;const t=out.tasks.find(t=>t.id===c.legacyId&&t.patient_id===p.id);if(t&&!!t.completed!==(c.status==='realizado')){t.completed=c.status==='realizado'?1:0;t.completed_at=t.completed?now:null;statements.push({sql:'UPDATE tasks SET completed=?,completed_at=? WHERE id=? AND patient_id=? AND EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?)',values:[t.completed,t.completed_at,t.id,p.id]});}}
 }
 return {source:out,statements};
}
