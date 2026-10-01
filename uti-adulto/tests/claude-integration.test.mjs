import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/pg.mjs';
import {mockClaude,KEY} from './helpers/claude-mock.mjs';
import {claudeJSON,strictSchema,collectUsage,ClaudeError} from '../worker/claude.ts';
import {assistantTools} from '../worker/assistant.ts';
import {enqueueJob,runJob,readJob,usageReport,jobSignature,verifyJobSignature,aiOperation} from '../worker/ai-jobs.ts';
import worker,{routeApi,runQueuedJob} from '../worker/index.ts';
import {createEmptyBed} from '../app/pep/core/icuStore.js';

const schema={type:'object',properties:{a:{type:'string',maxLength:5},b:{type:'array',items:{type:'object',properties:{c:{type:'integer'}}},maxItems:3}},required:['a']};

test('schema estrito: additionalProperties false, opcionais anuláveis e restrições não suportadas removidas',()=>{
 const s=strictSchema(schema);
 assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,['a','b']);
 assert.equal(s.properties.a.maxLength,undefined);assert.ok(s.properties.b.anyOf);assert.equal(s.properties.b.anyOf[0].maxItems,undefined);
 assert.equal(s.properties.b.anyOf[0].items.additionalProperties,false);
});

test('claudeJSON: modelo padrão, fallback no servidor, uso contabilizado e nulos removidos',async()=>{
 const mock=mockClaude(()=>({text:JSON.stringify({a:'ok',b:null})}));
 try{
  const {value:r,usage}=await collectUsage(()=>claudeJSON(KEY,{system:'S',content:'C',schema}));
  assert.deepEqual(r.value,{a:'ok'});assert.equal(r.model,'claude-opus-5-5');
  assert.equal(usage.length,1);assert.equal(usage[0].outputTokens,50);
  const sent=mock.calls[0];assert.equal(sent.body.system,'S');assert.equal(sent.body.output_config.effort,'medium');assert.equal(sent.body.fallbacks,'default');
  assert.equal(sent.headers.get('anthropic-beta'),'server-side-fallback-2026-07-01');assert.equal(sent.headers.get('x-api-key'),KEY.apiKey);
 }finally{mock.restore();}
});

test('recusa, resposta truncada e chave ausente geram erros legíveis',async()=>{
 let mock=mockClaude(()=>({stop_reason:'refusal',stop_details:{type:'refusal',category:'bio',explanation:'x'}}));
 try{await assert.rejects(()=>claudeJSON(KEY,{system:'S',content:'C',schema}),e=>e instanceof ClaudeError&&/recusou/.test(e.message)&&/bio/.test(e.message));}finally{mock.restore();}
 mock=mockClaude(()=>({text:'{"a":',stop_reason:'max_tokens'}));
 try{await assert.rejects(()=>claudeJSON(KEY,{system:'S',content:'C',schema}),/incompleta/);}finally{mock.restore();}
 await assert.rejects(()=>claudeJSON({apiKey:''},{system:'S',content:'C',schema}),e=>e.status===503);
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}},{status:401});
 try{await assert.rejects(()=>claudeJSON(KEY,{system:'S',content:'C',schema}),/Chave da API Anthropic inválida/);}finally{globalThis.fetch=original;}
});

test('ferramentas do assistente leem somente registros do paciente',()=>{
 const bed={...createEmptyBed('01'),patientId:'p1',episodeId:'p1',patientName:'SINTÉTICO',status:'occupied',dates:['2026-09-30','','','','',''],cells:{'0:44:0':'1,8'},
  dailyRecords:{'2026-09-30':{date:'2026-09-30',cells:{'44:0':'1,8'},evolution:{texto:'# CONDUTAS:\nManter ATB'}}}};
 const tools=Object.fromEntries(assistantTools(bed).map(t=>[t.definition.name,t]));
 assert.deepEqual(tools.datas_registradas.run({}),[{data:'2026-09-30',tem_ficha:true,tem_evolucao:true}]);
 assert.equal(Object.values(tools.ficha_do_dia.run({data:'2026-09-30'}))[0],'1,8');
 assert.match(tools.evolucao_do_dia.run({data:'2026-09-30'}),/Manter ATB/);
 assert.match(tools.evolucao_do_dia.run({data:'2026-09-29'}),/Sem evolução/);
 assert.throws(()=>tools.ficha_do_dia.run({data:'30/09/2026'}),/AAAA-MM-DD/);
 assert.deepEqual(tools.passagem_de_plantao.run({}).condutas,['Manter ATB']);
});

test('assistente: loop de ferramentas com Claude, auditoria e verificação de identidade',async()=>{
 const {db,sql}=await database();
 const env={DB:db,ACCESS_PASSWORD:'x',ACCESS_SESSION_SECRET:'y',ANTHROPIC_API_KEY:KEY.apiKey,ASSETS:{fetch:()=>new Response('')}};
 const pep=await (await routeApi(new Request('https://t/api/pep'),env)).json();
 const bedId='01';
 let r=await routeApi(new Request('https://t/api/pep',{method:'POST',body:JSON.stringify({version:pep.version,sourceToken:pep.sourceToken,actions:[{type:'UPDATE_BED',bedId,patch:{patientName:'PACIENTE SINTÉTICO'}}]})}),env);
 const state=(await r.json()).state;const b=state.beds[bedId];
 const mock=mockClaude((body,n)=>n===1?{tools:[{name:'identificacao',input:{}}]}:{text:'Paciente PACIENTE SINTÉTICO no leito 01. Dados registrados: identificação apenas.'});
 try{
  r=await routeApi(new Request('https://t/api/ai/assistant',{method:'POST',body:JSON.stringify({bedId,patientId:b.patientId,episodeId:b.episodeId,question:'Quem está no leito?'})}),env);
  const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));
  assert.match(data.answer,/PACIENTE SINTÉTICO/);assert.deepEqual(data.toolsUsed,['identificacao']);
  const second=mock.calls[1].body.messages;assert.equal(second.at(-1).content[0].type,'tool_result');assert.match(second.at(-1).content[0].content,/PACIENTE SINTÉTICO/);
  assert.ok(mock.calls[0].body.tools.every(t=>t.eager_input_streaming===true));
  assert.equal((await sql.prepare("SELECT COUNT(*) AS n FROM clinical_audit WHERE action='ai.assistant'").get()).n,1);
  r=await routeApi(new Request('https://t/api/ai/assistant',{method:'POST',body:JSON.stringify({bedId,patientId:'outro',episodeId:b.episodeId,question:'x'})}),env);
  assert.equal(r.status,409);
 }finally{mock.restore();await sql.close();}
});

test('fila de IA: assinatura, enfileiramento, execução única, resultado, uso e limpeza do corpo',async()=>{
 const {db,sql}=await database();
 try{
  const sig=await jobSignature('segredo','abc');assert.ok(await verifyJobSignature('segredo','abc',sig));assert.equal(await verifyJobSignature('segredo','abd',sig),false);assert.equal(await verifyJobSignature('outro','abc',sig),false);
  assert.equal(aiOperation('/api/pep/ai','POST','{"operation":"handoff"}'),'pep.handoff');assert.equal(aiOperation('/api/icu','POST','{"action":"addTask"}'),'');assert.equal(aiOperation('/api/icu','POST','{"action":"analyzeClinicalText"}'),'icu.analyze');
  const id=await enqueueJob(db,'/api/ai/ping','ping','{}');
  assert.equal((await readJob(db,id)).status,'queued');
  const mock=mockClaude(()=>({text:'OK'}));
  const env={DB:db,ANTHROPIC_API_KEY:KEY.apiKey,ASSETS:{fetch:()=>new Response('')}};
  try{assert.equal(await runQueuedJob(id,env),true);assert.equal(await runQueuedJob(id,env),false,'job executa uma única vez');}finally{mock.restore();}
  const job=await readJob(db,id);assert.equal(job.status,'done');assert.equal(job.httpStatus,200);assert.equal(JSON.parse(job.result).reply,'OK');
  const row=await sql.prepare('SELECT body,model,output_tokens FROM ai_jobs WHERE id=?').get(id);assert.equal(row.body,'');assert.equal(row.model,'claude-opus-5-5');assert.equal(row.output_tokens,5);
  const usage=await usageReport(db);assert.equal(usage.requests,1);assert.equal(usage.succeeded,1);assert.ok(usage.estimatedCostUSD>=0);assert.equal(usage.recent[0].operation,'ping');
  const failing=await enqueueJob(db,'/api/ai/ping','ping','{}');await runQueuedJob(failing,{DB:db,ANTHROPIC_API_KEY:'',ASSETS:{fetch:()=>new Response('')}});
  assert.equal((await readJob(db,failing)).status,'error');
 }finally{await sql.close();}
});

test('worker: em produção as rotas de IA respondem 202 com job; sem chave, 503; status da integração',async()=>{
 const {db,sql}=await database();
 try{
  const dispatched=[];const url='https://example.netlify.app';const ctx={waitUntil(){},passThroughOnException(){}};
  const env={DB:db,ACCESS_PASSWORD:'senha',ACCESS_SESSION_SECRET:'segredo',ANTHROPIC_API_KEY:KEY.apiKey,AI_DISPATCH:async id=>{dispatched.push(id);},ASSETS:{fetch:()=>new Response('<html></html>')}};
  const login=await worker.fetch(new Request(url+'/auth/login',{method:'POST',headers:{Origin:url,'Content-Type':'application/x-www-form-urlencoded'},body:'password=senha'}),env,ctx);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const status=await (await worker.fetch(new Request(url+'/api/ai/status',{headers:{cookie}}),env,ctx)).json();
  assert.deepEqual({c:status.configured,m:status.model,a:status.async},{c:true,m:'claude-opus-5-5',a:true});
  const r=await worker.fetch(new Request(url+'/api/ai/ping',{method:'POST',headers:{cookie,Origin:url},body:'{}'}),env,ctx);
  assert.equal(r.status,202);const {jobId}=await r.json();assert.deepEqual(dispatched,[jobId]);
  const poll=await (await worker.fetch(new Request(url+'/api/ai/job?id='+jobId,{headers:{cookie}}),env,ctx)).json();assert.equal(poll.status,'queued');
  const plain=await worker.fetch(new Request(url+'/api/icu',{method:'POST',headers:{cookie,Origin:url},body:JSON.stringify({action:'addTask'})}),env,ctx);
  assert.equal(plain.status,400,'rotas sem IA continuam síncronas');
  const noKey=await worker.fetch(new Request(url+'/api/ai/ping',{method:'POST',headers:{cookie,Origin:url},body:'{}'}),{...env,ANTHROPIC_API_KEY:''},ctx);
  assert.equal(noKey.status,503);
  assert.equal((await worker.fetch(new Request(url+'/api/ai/job?id=x'),env,ctx)).status,401,'consulta de job exige sessão');
 }finally{await sql.close();}
});

test('Netlify AI Gateway: usa a URL injetada e desativa o fallback beta (cabeçalhos não repassados)',async()=>{
 const {configFromEnv}=await import('../worker/claude.ts');
 const gw=configFromEnv({ANTHROPIC_API_KEY:'k',ANTHROPIC_BASE_URL:'https://gateway.netlify.test/anthropic'});
 assert.equal(gw.fallbacks,false);assert.equal(gw.baseURL,'https://gateway.netlify.test/anthropic');
 assert.equal(configFromEnv({ANTHROPIC_API_KEY:'k'}).fallbacks,true);
 const original=globalThis.fetch;let sent;globalThis.fetch=async(url,init)=>{sent={url:String(url),body:JSON.parse(init.body),beta:new Headers(init.headers).get('anthropic-beta')};return new Response('event: message_start\ndata: {"type":"message_start","message":{"id":"m","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"stop_reason":null,"usage":{"input_tokens":1,"output_tokens":0}}}\n\nevent: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"{\\"a\\":\\"x\\"}"}}\n\nevent: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\nevent: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n',{headers:{'content-type':'text/event-stream'}});};
 try{const r=await claudeJSON(gw,{system:'S',content:'C',schema});assert.deepEqual(r.value,{a:'x'});assert.match(sent.url,/^https:\/\/gateway\.netlify\.test\/anthropic\/v1\/messages/);assert.equal(sent.body.fallbacks,undefined);assert.equal(sent.beta,null);}finally{globalThis.fetch=original;}
});
