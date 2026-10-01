import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/pg.mjs';
import worker from '../worker/index.ts';

const ctx={waitUntil(){},passThroughOnException(){}};
const url='https://example.netlify.app';

test('Postgres: parâmetros, retorno no formato D1 e lote atômico com rollback',async()=>{
 const {db,sql}=await database();
 try{
  await db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('test','01','Paciente de teste').run();
  assert.equal(await db.prepare('SELECT name FROM patients WHERE id=?').bind('test').first('name'),'Paciente de teste');
  await assert.rejects(()=>db.batch([db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('rollback','02','Teste'),db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('test','03','Duplicado')]));
  assert.equal(await db.prepare('SELECT id FROM patients WHERE id=?').bind('rollback').first(),null);
  const inserted=await db.prepare('INSERT INTO tasks(patient_id,text) VALUES (?,?)').bind('test','Tarefa').run();
  assert.ok(inserted.meta.last_row_id>0);assert.equal(inserted.meta.changes,1);
  const audit=await db.prepare("SELECT COUNT(*) AS n FROM clinical_audit WHERE action IN ('patients.insert','tasks.insert')").first('n');
  assert.equal(audit,2,'gatilhos de auditoria registram inserções');
  const alias=await db.prepare('SELECT patient_id AS patientId FROM tasks').first();
  assert.equal(alias.patientId,'test','apelidos camelCase preservados');
 }finally{await sql.close();}
});

test('fluxo completo: login, proteção de origem, salvamento e recarga do prontuário',async()=>{
 const {db,sql}=await database();
 try{
  const env={DB:db,ACCESS_PASSWORD:'test-only',ACCESS_SESSION_SECRET:'test-secret-only',ASSETS:{fetch:()=>new Response('<html>UTI</html>')}};
  assert.equal((await worker.fetch(new Request(url+'/api/pep'),env,ctx)).status,401);
  assert.equal((await worker.fetch(new Request(url+'/api/pep',{method:'POST',headers:{Origin:'https://foreign.invalid'}}),env,ctx)).status,403);
  const login=await worker.fetch(new Request(url+'/auth/login',{method:'POST',headers:{Origin:url,'Content-Type':'application/x-www-form-urlencoded'},body:'password=test-only'}),env,ctx);
  assert.equal(login.status,303);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const response=await worker.fetch(new Request(url+'/api/pep',{headers:{cookie}}),env,ctx);
  assert.equal(response.status,200);
  const data=await response.json();assert.ok(data.state);assert.equal(data.version,0);
  const bedId=Object.keys(data.state.beds).find(id=>data.state.beds[id].status==='empty');
  const saved=await worker.fetch(new Request(url+'/api/pep',{method:'POST',headers:{cookie,Origin:url,'Content-Type':'application/json'},body:JSON.stringify({version:data.version,sourceToken:data.sourceToken,requestId:'netlify-test-operation-00001',actions:[{type:'UPDATE_BED',bedId,patch:{patientName:'Teste Netlify'}}]})}),env,ctx);
  assert.equal(saved.status,200,await saved.clone().text());
  assert.equal((await saved.json()).version,1);
  const reload=await (await worker.fetch(new Request(url+'/api/pep',{headers:{cookie}}),env,ctx)).json();
  assert.equal(reload.state.beds[bedId].patientName,'Teste Netlify');
  assert.equal(reload.version,1);
  // Uma segunda leitura sem alterações deve manter a mesma impressão digital (ordem determinística).
  const again=await (await worker.fetch(new Request(url+'/api/pep',{headers:{cookie}}),env,ctx)).json();
  assert.equal(again.sourceToken,reload.sourceToken);
  assert.equal((await sql.prepare('SELECT name FROM patients').get()).name,'Teste Netlify');
  assert.equal((await worker.fetch(new Request(url+'/',{headers:{cookie}}),env,ctx)).status,200);
 }finally{await sql.close();}
});

test('função Netlify serve páginas embutidas somente após autenticação',async()=>{
 const {default:pages}=await import('../netlify/functions/_generated/pages.mjs');
 assert.match(pages['index.html'],/<div id="root">/);
 assert.ok(pages['ficha-uti/index.html'].length>1000);
 assert.ok(pages['ficha-uti-integrada.html'].length>1000);
});
