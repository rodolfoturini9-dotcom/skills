import {mergeBackup} from '../app/pep/core/backupMerge.js';
import {calculate} from '../app/pep/core/prescricao.js';
import {A,icuReducer,createEmptyBed,BED_IDS,hydrate} from '../app/pep/core/icuStore.js';
import {LEGACY_TABLES,mapLegacy,reconcileLegacy,episodeEntries,projectionForSync} from '../app/pep/core/productionBridge.js';
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function legacySource(db:D1Database){const source:any={};for(const table of LEGACY_TABLES)source[table]=(await db.prepare(`SELECT * FROM ${table}`).all()).results;return source;}
const canonical=(x:any):string=>x&&typeof x==='object'?Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export async function fingerprint(source:any){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(source))))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function loadPep(db:D1Database){
 const source=await legacySource(db);
 const row:any=await db.prepare('SELECT * FROM pep_revisions ORDER BY version DESC LIMIT 1').first();
 const state=row?reconcileLegacy(JSON.parse(row.data),JSON.parse(row.source_data),source):mapLegacy(source);
 return {state,version:row?.version||0,sourceToken:await fingerprint(source),source};
}
function validDate(value:any,empty=true){if(empty&&value==='')return true;return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function validState(state:any){
 const patients=new Set(),episodes=new Set();
 for(const b of episodeEntries(state) as any[]){
  if(!b.patientId||!b.episodeId||patients.has(b.patientId)||episodes.has(b.episodeId))throw Error('Identificadores ausentes ou repetidos.');patients.add(b.patientId);episodes.add(b.episodeId);
  if(!b.patientName?.trim()||b.patientName.length>200||!validDate(b.admissionDate)||!validDate(b.hospitalAdmissionDate)||!Array.isArray(b.dates)||b.dates.length!==6||b.dates.some((d:any)=>!validDate(d)))throw Error('Identificação ou datas inválidas.');
  if(new Set(b.dates.filter(Boolean)).size!==b.dates.filter(Boolean).length)throw Error('Datas duplicadas na ficha.');
  for(const [k,v]of Object.entries(b.cells||{})){if(!/^[0-5]:([0-9]|[1-4][0-9]|5[0-4]):[01]$/.test(k)||[5,6,11].includes(+k.split(':')[1])||typeof v!=='string'||v.length>300)throw Error('Célula inválida.');}
  for(const [date,r]of Object.entries(b.dailyRecords||{})as any){if(!validDate(date,false)||!r||typeof r!=='object')throw Error('Histórico diário inválido.');}
 }
 if(JSON.stringify(state).length>10000000)throw Error('Estado excede o limite de 10 MB.');
}
export function applyAction(state:any,action:any){
 if(!action||typeof action.type!=='string'||!Object.values(A).includes(action.type)&&!['RESTORE_EPISODE','SELECT_EPISODE','MERGE_BACKUP'].includes(action.type))throw Error('Ação inválida.');
 if([A.RESET_ALL,A.IMPORT_STATE].includes(action.type))throw Error('Substituição geral bloqueada. Use a importação legada revisada.');
 if(action.type==='MERGE_BACKUP')return mergeBackup(state,action.state);
 const b=state.beds[action.bedId];
 if(action.type===A.SET_ACTIVE_BED)return icuReducer(state,action);
 if(action.type==='SELECT_EPISODE'){const old=state.archivedEpisodes?.[action.patientId];if(!old)throw Error('Internação arquivada não encontrada.');return {...state,reviewEpisodeId:action.patientId};}
 if(action.type==='RESTORE_EPISODE'){const old=state.archivedEpisodes?.[action.patientId];if(!old||!BED_IDS.includes(action.toBedId)||state.beds[action.toBedId].status!=='empty')throw Error('Selecione um leito livre.');const archived={...state.archivedEpisodes};delete archived[action.patientId];return {...state,reviewEpisodeId:null,activeBedId:action.toBedId,archivedEpisodes:archived,beds:{...state.beds,[action.toBedId]:{...old,bedId:action.toBedId,archived:false}}};}
 if(action.type===A.SAVE_MEDICATION){if(!action.medication||typeof action.medication.id!=='string')throw Error('Catálogo inválido.');return icuReducer(state,action);}
 if(!b||!BED_IDS.includes(action.bedId))throw Error('Leito inválido.');
 if(b.status==='empty'&&action.type!==A.UPDATE_BED)throw Error('Leito vazio. Admita um paciente antes de registrar dados.');
 if(state.reviewEpisodeId)throw Error('Histórico arquivado em consulta. Restaure a internação para editar.');
 if(b.patientId&&action.patientId!==b.patientId||b.episodeId&&action.episodeId!==b.episodeId)throw Error('O ocupante do leito mudou. Recarregue.');
 if(action.type===A.UPDATE_BED){if(action.patch?.prescriptions){for(const rx of action.patch.prescriptions){const old=(b.prescriptions||[]).find((x:any)=>x.id===rx.id);if(old&&JSON.stringify(old)!==JSON.stringify(rx))throw Error('Uma prescrição salva não pode ser recalculada. Remova e inclua outro item.');if(!old&&rx.medication?.calc_peso)calculate(rx.medication,rx.desired,rx.weight);}}if(!action.patch||typeof action.patch!=='object'||Array.isArray(action.patch))throw Error('Alteração inválida.');const forbidden=['patientId','episodeId','bedId','legacyPatient','legacySheet','legacyRecords','legacyDocuments','legacyEvents','archived'];if(forbidden.some(k=>Object.hasOwn(action.patch,k)))throw Error('Vínculos não podem ser alterados.');if(b.status==='empty'&&action.patch.patientName?.trim()){const id=crypto.randomUUID();state={...state,beds:{...state.beds,[b.bedId]:{...b,patientId:id,episodeId:id}}};}}
 if(action.type===A.DISCHARGE_BED){if(!b.patientId)throw Error('Leito já vazio.');return {...state,archivedEpisodes:{...state.archivedEpisodes,[b.patientId]:{...b,archived:true,archivedAt:new Date().toISOString()}},beds:{...state.beds,[b.bedId]:createEmptyBed(b.bedId)}};}
 if(action.type===A.SET_DATE){if(!validDate(action.value))throw Error('Data inválida.');if(b.dates.some((d:any,i:number)=>i!==action.day&&d&&d===action.value))throw Error('Data duplicada.');}
 if(action.type===A.SET_CELL&&(!Number.isInteger(action.day)||action.day<0||action.day>5||!Number.isInteger(action.row)||action.row<0||action.row>54||[5,6,11].includes(action.row)||![0,1].includes(action.slot)))throw Error('Célula inválida.');
 return icuReducer(state,action);
}
// Compara o conteúdo integral das tabelas legadas dentro da transação; um vínculo/registro
// alterado entre leitura e commit impede a revisão e todas as escritas derivadas.
function conjunction(parts:string[]):string{if(!parts.length)return '1';if(parts.length===1)return parts[0];const middle=Math.floor(parts.length/2);return '('+conjunction(parts.slice(0,middle))+' AND '+conjunction(parts.slice(middle))+')';}
function legacyGuard(source:any){const clauses:string[]=[];for(const table of LEGACY_TABLES){const rows=source[table]||[];clauses.push(`(SELECT COUNT(*) FROM ${table})=json_array_length(json_extract(?, '$.${table}'))`);if(rows.length){const cols=Object.keys(rows[0]);const cmp=conjunction(cols.map(k=>`t."${k}" IS json_extract(j.value,'$.${k}')`));clauses.push(`NOT EXISTS (SELECT 1 FROM json_each(json_extract(?, '$.${table}')) j WHERE NOT EXISTS (SELECT 1 FROM ${table} t WHERE ${cmp}))`);}}return clauses;}
export async function handlePepApi(request:Request,db:D1Database){let phase='load';try{
 const loaded=await loadPep(db);
 if(request.method==='GET'){const url=new URL(request.url);if(url.searchParams.get('op')==='backup'){const audit=(await db.prepare('SELECT * FROM clinical_audit').all()).results;const revisions=(await db.prepare('SELECT * FROM pep_revisions ORDER BY version').all()).results;return reply({format:'uti-pep-backup-v1',at:new Date().toISOString(),tables:{...loaded.source,clinical_audit:audit,pep_revisions:revisions},counts:Object.fromEntries(Object.entries({...loaded.source,clinical_audit:audit,pep_revisions:revisions}).map(([k,v]:any)=>[k,v.length]))});}return reply({state:loaded.state,version:loaded.version,sourceToken:loaded.sourceToken});}
 if(request.method!=='POST')return reply({error:'Método não permitido'},405);
 const text=await request.text();if(text.length>3000000)return reply({error:'Entrada muito extensa'},413);const body=JSON.parse(text);
 if(body.requestId){const acknowledged=await db.prepare('SELECT version FROM pep_revisions WHERE operation_id=?').bind(body.requestId).first();if(acknowledged)return reply({state:loaded.state,version:loaded.version,sourceToken:loaded.sourceToken,acknowledgedRequestId:body.requestId,replayed:true,savedVersion:acknowledged.version});}
 if(!Array.isArray(body.actions)||!body.actions.length||body.actions.length>100||body.version!==loaded.version||body.sourceToken!==loaded.sourceToken)return reply({error:'Dados alterados em outra sessão. Preserve o rascunho e recarregue antes de aplicar.'},409);
 if(body.requestId!==undefined&&(typeof body.requestId!=='string'||!/^[-a-zA-Z0-9]{20,80}$/.test(body.requestId)))throw Error('Identificador de salvamento inválido.');
 const before=loaded.state;phase='validate';let state=before;for(const action of body.actions){
  if(action.type===A.IMPORT_CHART){
   if(body.actions.length!==1||action.reviewVersion!==loaded.version||action.document?.review_token!==await fingerprint(state.beds[action.bedId]))return reply({error:'Os registros mudaram desde a revisão. Gere e revise novamente; nenhum campo foi aplicado.'},409);
   if(!['records','external','openai'].includes(action.metadata?.source)||typeof action.metadata?.sourceText!=='string'||action.metadata.sourceText.length>120000)throw Error('Origem de importação inválida.');
   action.metadata={source:action.metadata.source,sourceText:action.metadata.sourceText,author:'Usuário autenticado',at:new Date().toISOString()};
  }
  state=applyAction(state,action);
 }validState(state);
 const version=loaded.version+1,operationId=body.requestId||crypto.randomUUID(),now=new Date().toISOString();
 const sync=projectionForSync(state,loaded.source,now);state.legacyPreserved=sync.source;
 const guard=legacyGuard(loaded.source),sourceJson=JSON.stringify(loaded.source);
 const insert=db.prepare(`INSERT INTO pep_revisions(version,operation_id,data,source_data,author,saved_at) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT MAX(version) FROM pep_revisions),0)=? AND ${conjunction(guard)}`).bind(version,operationId,JSON.stringify(state),JSON.stringify(sync.source),'Usuário autenticado',now,loaded.version,...guard.map(()=>sourceJson));
 const audit=db.prepare('INSERT INTO clinical_audit(patient_id,action,author,at,before,after) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM pep_revisions WHERE version=? AND operation_id=?)').bind(body.actions[0].patientId||'','pep.save','Usuário autenticado',now,JSON.stringify({version:loaded.version}),JSON.stringify({version,actions:body.actions.map((a:any)=>a.type)}),version,operationId);
 phase='commit';const results=await db.batch([insert,...sync.statements.map((s:any)=>db.prepare(s.sql).bind(...s.values,version,operationId)),audit]);
 if(!results[0].meta.changes)return reply({error:'Conflito durante o salvamento. Nenhuma alteração aplicada.'},409);
 phase='reload';const final=await loadPep(db);return reply({state:final.state,version:final.version,sourceToken:final.sourceToken,acknowledgedRequestId:operationId});
 }catch(e){const errorId=crypto.randomUUID(),message=e instanceof Error?e.message:'Falha ao persistir os dados.';console.error('pep.request.failed',JSON.stringify({errorId,phase,method:request.method,category:message.startsWith('D1_')?'database':'validation'}));return reply({error:message,errorId},phase==='commit'||phase==='reload'?503:400);}}
