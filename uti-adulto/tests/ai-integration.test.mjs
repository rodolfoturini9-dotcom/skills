import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
fs.mkdirSync('.sites-runtime/tests',{recursive:true});
for(const name of ['sheet-api','icu-api'])await build({entryPoints:['worker/'+name+'.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/ai-'+name+'.mjs'});
const {interpretSheet}=await import('../.sites-runtime/tests/ai-sheet-api.mjs');
const {handleIcuApi}=await import('../.sites-runtime/tests/ai-icu-api.mjs');
const req=(url,body)=>new Request(url,{method:'POST',body:JSON.stringify(body)});

test('sem chave a extração interna não chama serviço externo',async()=>{
 const r=await interpretSheet(req('https://unit.test/api/ficha/interpret',{day:0,text:'Hb: 10'}),'');
 assert.equal(r.status,503);
});

test('imagem extrai dias independentes, limita índices e não armazena resposta',async()=>{
 const original=globalThis.fetch;let payload;
 globalThis.fetch=async(_url,init)=>{payload=JSON.parse(init.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({patient:'PACIENTE SINTÉTICO',admission:'',bed:'01',days:[{day:0,date:'27/09/2026',cells:[{row:38,slot:1,value:'10 g/dL'},{row:55,slot:0,value:'inválido'}]},{day:1,date:'28/09/2026',cells:[{row:43,slot:0,value:'140'}]}]})}]}]});};
 try{
  const r=await interpretSheet(req('https://unit.test/api/ficha/interpret',{day:0,image:'data:image/png;base64,AAAA'}),'chave-sintetica');
  assert.equal(r.status,200);const result=await r.json();assert.equal(result.days[0].cells['38'][1],'10 g/dL');assert.equal(result.days[1].cells['43'][0],'140');assert.equal(result.days[0].cells['55'],undefined);
  assert.equal(payload.store,false);assert.equal(payload.text.format.type,'json_schema');assert.equal(payload.input[0].content[1].type,'input_image');
 }finally{globalThis.fetch=original;}
});

test('texto com data divergente não propõe células para outro dia',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({patient:{diagnoses:'',summary:''},dailyGoals:[],day:{date:'27/09/2026',cells:[{row:38,slot:1,value:'10'}]}})}]}]});
 try{
  const r=await handleIcuApi(req('https://unit.test/api/icu',{action:'analyzeClinicalText',date:'2026-09-28',text:'Hb: 10; 27/09/2026'}),{},'chave-sintetica');
  assert.equal(r.status,409);
 }finally{globalThis.fetch=original;}
});
