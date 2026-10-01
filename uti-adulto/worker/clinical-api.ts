import { kinds, validate, type ClinicalRecord, type Kind } from '../app/clinical/model';
const tables=['patients','tasks','events','evolutions','daily_goals','medical_documents','prescribers','custom_medications','clinical_records','daily_sheets','clinical_audit'];
const IDENTITY:Record<string,string>={tasks:'id',events:'id',evolutions:'id',daily_goals:'id',medical_documents:'id',prescribers:'id',custom_medications:'id',clinical_records:'sequence',clinical_audit:'id'};
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const decode=(r:any):ClinicalRecord=>({id:r.id,patientId:r.patient_id,kind:r.kind,date:r.date,version:r.version,status:r.status,data:JSON.parse(r.data),author:r.author,source:r.source,savedAt:r.saved_at});
function check(r:any){if(!r||typeof r.id!=='string'||r.id.length>100||typeof r.patientId!=='string'||!Object.hasOwn(kinds,r.kind)||!['draft','final'].includes(r.status)||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(r.date)||!Number.isFinite(Date.parse(r.date)))throw Error('Registro inválido');if(new Date(r.date.slice(0,10)+'T12:00:00Z').toISOString().slice(0,10)!==r.date.slice(0,10))throw Error('Data inexistente');if(!r.data||Array.isArray(r.data)||typeof r.data!=='object'||Object.keys(r.data).length>300||Object.entries(r.data).some(([k,v])=>['__proto__','constructor','prototype'].includes(k)||typeof v!=='string')||JSON.stringify(r.data).length>200000)throw Error('Conteúdo inválido');const errors=validate(r.kind as Kind,r.data);if(errors.length)throw Error(errors.join('; '));}
export async function handleClinicalApi(request:Request,db:any){try{
 const url=new URL(request.url);
 if(request.method==='GET'){
  if(url.searchParams.get('op')==='backup'){const data:Record<string,unknown>={};for(const t of tables)data[t]=(await db.prepare(`SELECT * FROM ${t}`).all()).results;await db.prepare("INSERT INTO clinical_audit(patient_id,action,author,at) VALUES ('','backup_export','Usuário autenticado',?)").bind(new Date().toISOString()).run();return reply({format:'uti-backup-v2',at:new Date().toISOString(),tables:data});}
  if(url.searchParams.get('op')==='audit')return reply({rows:(await db.prepare('SELECT * FROM clinical_audit ORDER BY id DESC LIMIT 300').all()).results});
  const id=url.searchParams.get('history');const result=id?await db.prepare('SELECT * FROM clinical_records WHERE id=? ORDER BY version DESC').bind(id).all():await db.prepare('SELECT * FROM clinical_records WHERE (id,version) IN (SELECT id,MAX(version) FROM clinical_records GROUP BY id)').all();return reply({records:result.results.map(decode)});
 }
 if(request.method!=='POST')return reply({error:'Método não permitido'},405);
 const raw=await request.text();if(raw.length>10000000)return reply({error:'Arquivo excede 10 MB'},413);const body=JSON.parse(raw);
 if(body.action==='restore'){
  if(body.confirmed!==true||body.backup?.format!=='uti-backup-v2')throw Error('Confirme a restauração de um backup compatível');const statements:any[]=[];
  for(const t of tables){const rows=body.backup.tables?.[t];if(!Array.isArray(rows))throw Error(`Tabela ausente: ${t}`);const columns=(await db.prepare('SELECT column_name AS name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=?').bind(t).all()).results.map((c:any)=>c.name);for(const row of rows){if(!row||Array.isArray(row)||typeof row!=='object')throw Error('Linha inválida');const keys=Object.keys(row).filter(k=>!(t==='clinical_records'&&k==='sequence')&&!(t==='clinical_audit'&&k==='id'));if(!keys.length||keys.some(k=>!columns.includes(k))||keys.some(k=>row[k]!==null&&!['string','number'].includes(typeof row[k])))throw Error('Colunas inválidas');if(t==='clinical_records'){check(decode(row));if(!Number.isInteger(row.version)||row.version<1)throw Error('Versão inválida');}statements.push(db.prepare(`INSERT INTO ${t} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT DO NOTHING`).bind(...keys.map(k=>row[k])));if(statements.length>800)throw Error('Mais de 800 registros: restauração administrativa necessária');}}
  // Após inserir identificadores explícitos, avança as sequências para evitar colisões futuras.
  for(const [t,col] of Object.entries(IDENTITY))statements.push(db.prepare(`SELECT setval(pg_get_serial_sequence('${t}','${col}'),GREATEST(COALESCE((SELECT MAX(${col}) FROM ${t}),0),1),(SELECT COUNT(*)>0 FROM ${t}))`));
  statements.push(db.prepare("INSERT INTO clinical_audit(patient_id,action,author,at) VALUES ('','backup_restore','Usuário autenticado',?)").bind(new Date().toISOString()));await db.batch(statements);return reply({ok:true});
 }
 if(body.action!=='save')throw Error('Ação inválida');if(!Number.isInteger(body.expectedVersion)||body.expectedVersion<0)throw Error('Versão inválida');const r=body.record;check(r);
 if(!await db.prepare('SELECT id FROM patients WHERE id=?').bind(r.patientId).first())throw Error('Paciente não encontrado');
 const previous:any=await db.prepare('SELECT * FROM clinical_records WHERE id=? ORDER BY version DESC LIMIT 1').bind(r.id).first();
 if((previous?.version||0)!==body.expectedVersion)return reply({error:'Outra versão foi salva. Recarregue o histórico antes de continuar.'},409);
 if(previous&&(previous.patient_id!==r.patientId||previous.kind!==r.kind))throw Error('Vínculo não pode ser alterado');
 if(previous?.status==='final'&&body.amendment!==true)throw Error('Confirme a retificação do documento finalizado');
 if(r.status==='final'&&(body.confirmed!==true||!r.data.physician?.trim()))throw Error('Finalização exige médico e confirmação');
 const savedAt=new Date().toISOString(),version=body.expectedVersion+1,author='Usuário autenticado';
 const result=await db.prepare('INSERT INTO clinical_records(id,patient_id,kind,date,version,status,data,author,source,saved_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT MAX(version) FROM clinical_records WHERE id=?),0)=?').bind(r.id,r.patientId,r.kind,r.date,version,r.status,JSON.stringify(r.data),author,String(r.source||'Manual').slice(0,200),savedAt,r.id,body.expectedVersion).run();
 if(!result.meta.changes)return reply({error:'Conflito de edição: recarregue o histórico'},409);
 return reply({record:{...r,version,author,savedAt}});
 }catch(e){return reply({error:e instanceof SyntaxError?'JSON inválido':e instanceof Error?e.message:'Não foi possível salvar'},400);}}
