import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {createDatabase} from '../server/database.mjs';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../worker/index.ts';

test('schema, parâmetros, retorno D1 e lote atômico',async()=>{
 const client=createClient({url:'file::memory:'});
 try {
 for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){
 const sql=await readFile('drizzle/'+file,'utf8');
 await client.batch(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean),'write');
 }
 const db=createDatabase(client);
 await db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('test','01','Paciente de teste').run();
 assert.equal(await db.prepare('SELECT name FROM patients WHERE id=?').bind('test').first('name'),'Paciente de teste');
 await assert.rejects(()=>db.batch([db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('rollback','02','Teste'),db.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').bind('test','03','Duplicado')]));
 assert.equal(await db.prepare('SELECT id FROM patients WHERE id=?').bind('rollback').first(),null);
 const env={DB:db,ACCESS_PASSWORD:'test-only',ACCESS_SESSION_SECRET:'test-secret-only',ASSETS:{fetch:()=>new Response('<html>UTI</html>')}};
 const ctx={waitUntil(){},passThroughOnException(){}};
 const url='https://example.netlify.app';
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
 const reload=await worker.fetch(new Request(url+'/api/pep',{headers:{cookie}}),env,ctx);
 assert.equal((await reload.json()).state.beds[bedId].patientName,'Teste Netlify');
 assert.equal((await worker.fetch(new Request(url+'/',{headers:{cookie}}),env,ctx)).status,200);
 }finally{client.close();}
});
