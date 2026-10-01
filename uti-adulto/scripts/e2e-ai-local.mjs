// E2E local da IA: funções empacotadas (principal + background), Postgres real, API Anthropic simulada
// e navegador real. Uso: NETLIFY_DB_URL=postgres://... node scripts/e2e-ai-local.mjs
import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {mockClaude} from '../tests/helpers/claude-mock.mjs';
process.env.ACCESS_PASSWORD='senha-e2e';process.env.ACCESS_SESSION_SECRET='segredo-e2e-0123456789';process.env.ANTHROPIC_API_KEY='sk-ant-synthetic-e2e';
const {default:main}=await import('../.sites-runtime/fn/uti.mjs');
const {default:background}=await import('../.sites-runtime/fn/ai-background.mjs');
const calls=[];
const mock=mockClaude((body,n)=>{calls.push(body);
 if(body.tools){const answered=body.messages.some(m=>Array.isArray(m.content)&&m.content.some(c=>c.type==='tool_result'));
  return answered?{text:'Dados registrados: paciente PACIENTE E2E, leito 01. Sem ficha registrada.'}:{tools:[{name:'identificacao',input:{}},{name:'datas_registradas',input:{}}]};}
 return {text:'OK'};});
const server=http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
 const url='http://127.0.0.1:'+server.address().port+req.url;
 if(req.url.startsWith('/assets/')||req.url.endsWith('.webmanifest')||req.url.endsWith('.svg')){const f='dist'+req.url.split('?')[0];if(fs.existsSync(f)){res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(f));return;}}
 const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body});
 if(req.url.startsWith('/.netlify/functions/ai-background')){res.statusCode=202;res.end();setTimeout(()=>background(request).catch(e=>console.error('bg',e)),0);return;}
 const r=await main(request);res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
// Cookie Secure: o Chromium aceita em http://127.0.0.1 (contexto confiável).
const {chromium}=await import('playwright-core');
const browser=await chromium.launch({executablePath:process.env.PEP_CHROMIUM_EXECUTABLE||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const results={};
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.fill('input[name=password]','senha-e2e');await page.click('button[type=submit]');
 await page.getByRole('heading',{name:'Mapa de leitos',exact:true}).waitFor({timeout:20000});
 // Admite paciente sintético
 await page.getByRole('button',{name:'Admitir paciente no leito 01'}).click();await page.locator('input[autocapitalize=characters]').fill('PACIENTE E2E');await page.getByRole('button',{name:'Salvar'}).click();
 await page.getByRole('status').filter({hasText:/^Salvo no servidor$/}).waitFor({timeout:20000});
 // Painel de IA: status e teste de conexão (job em background)
 await page.getByRole('navigation',{name:'Principal'}).getByRole('button',{name:'IA · Claude'}).click();
 await page.getByText('Configurada',{exact:true}).waitFor();await page.getByRole('button',{name:'Testar conexão'}).click();
 await page.getByText(/Conexão confirmada · modelo claude-opus-5-5/).waitFor({timeout:30000});results.ping=true;
 await page.getByText('Teste de conexão',{exact:true}).first().waitFor();results.usageListed=true;
 // Assistente clínico
 await page.getByRole('navigation',{name:'Principal'}).getByRole('button',{name:'Mapa de leitos'}).click();
 await page.getByRole('button',{name:'Abrir painel do leito 01'}).click();
 await page.getByLabel('Pergunta').fill('Quem é o paciente?');await page.getByRole('button',{name:'Perguntar',exact:true}).click();
 await page.getByText(/Dados registrados: paciente PACIENTE E2E/).waitFor({timeout:30000});results.assistant=true;
 assert.match(await page.locator('.ai-answer').innerText(),/Identificação, Datas registradas/);
 await page.screenshot({path:'.sites-runtime/e2e-ai-assistant.png',fullPage:false});
 results.errors=errors;results.claudeCalls=calls.length;
 const toolTurn=calls.find(c=>c.tools);assert.ok(toolTurn.tools.some(t=>t.name==='ficha_do_dia'));
 assert.deepEqual(errors,[]);
 console.log('E2E IA OK',JSON.stringify(results));
}finally{await browser.close();server.close();mock.restore();}
process.exit(0);
