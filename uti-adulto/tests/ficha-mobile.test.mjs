import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import fs from 'node:fs';
import {database as pgDatabase} from './helpers/pg.mjs';

await build({entryPoints:['app/icu/fichaModel.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/ficha-model.mjs'});
await build({entryPoints:['app/icu/Ficha.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.sites-runtime/tests/ficha-render.mjs'});
await build({entryPoints:['worker/sheet-api.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/ficha-api.mjs'});
const model=await import('../.sites-runtime/tests/ficha-model.mjs');
const {FichaPrint}=await import('../.sites-runtime/tests/ficha-render.mjs');
const {handleSheetApi}=await import('../.sites-runtime/tests/ficha-api.mjs');
await build({entryPoints:['app/icu/extractionPrompt.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/extraction-prompt.mjs'});
const {buildExtractionPrompt}=await import('../.sites-runtime/tests/extraction-prompt.mjs');
const empty=()=>({patient:'PACIENTE SINTÉTICO',admission:'28/09/2026',bed:'01',dates:Array(6).fill(''),cells:{}});

test('matriz contém 55 linhas na ordem oficial e conserva os campos livres',()=>{
 assert.equal(model.FICHA_ROWS.length,55);
 assert.deepEqual(model.FICHA_ROWS.map(r=>r.id),Array.from({length:55},(_,i)=>i));
 assert.deepEqual(model.FICHA_GROUPS.map(g=>g.rows.length),[3,4,6,6,4,3,4,1,3,4,5,11,1]);
 assert.equal(model.FICHA_ROWS[11].editable,false);
 assert.equal(model.FICHA_ROWS[5].labels[0],'');
 assert.deepEqual(model.FICHA_ROWS[54].labels,['MB','TROPO']);
});

test('cópia mantém dados existentes e limpeza afeta apenas o dia escolhido',()=>{
 const s=empty();s.cells={'0:13:0':'65','0:13:1':'88','1:13:0':'70','2:34:0':'7,31'};s.dates[1]='28/09/2026';
 const copied=model.copyPrevious(s,1);
 assert.equal(copied.cells['1:13:0'],'70');assert.equal(copied.cells['1:13:1'],'88');
 const cleared=model.clearDay(copied,1);assert.equal(cleared.cells['1:13:0'],undefined);assert.equal(cleared.dates[1],'');assert.equal(cleared.cells['0:13:0'],'65');assert.equal(cleared.cells['2:34:0'],'7,31');
});

test('extração de seis dias rejeita identidade divergente e preserva conflitos',()=>{
 const s=empty();s.cells['0:34:0']='7,30';
 assert.throws(()=>model.mergeExtracted(s,{patient:'OUTRO',days:[]}),/nome extraído difere/);
 const days=Array.from({length:6},()=>({date:'',cells:{}}));days[0]={date:'28/09/2026',cells:{'34':['7,40','-4']}};days[5]={date:'03/10/2026',cells:{'54':['12','0,2']}};
 const result=model.mergeExtracted(s,{patient:s.patient,days});
 assert.equal(result.conflicts,1);assert.equal(result.added,3);assert.equal(result.sheet.cells['0:34:0'],'7,30');assert.equal(result.sheet.cells['0:34:1'],'-4');assert.equal(result.sheet.cells['5:54:0'],'12');assert.equal(result.sheet.dates[5],'03/10/2026');
});

test('backup da ficha importa apenas campos vazios do mesmo paciente e leito',()=>{
 const s=empty();s.cells['0:13:0']='65';const b=empty();b.cells={'0:13:0':'70','0:13:1':'90'};b.dates[0]='28/09/2026';
 const result=model.mergeBackup(s,b);assert.equal(result.conflicts,1);assert.equal(result.added,1);assert.equal(result.sheet.cells['0:13:0'],'65');assert.equal(result.sheet.cells['0:13:1'],'90');
 assert.throws(()=>model.mergeBackup(s,{...b,patient:'OUTRO'}),/outro paciente/);
 assert.throws(()=>model.mergeBackup(s,{...b,cells:{'6:54:0':'12'}}),/Célula inválida/);
});

test('impressão usa cabeçalho institucional, 15 colunas e seis datas do mesmo objeto',()=>{
 const s=empty();s.dates=['28/09/2026','29/09/2026','','','',''];s.cells['0:34:0']='7,30';
 const p={id:'synthetic',name:s.patient,bed:s.bed};
 const html=renderToStaticMarkup(createElement(FichaPrint,{patient:p,sheet:s,containerRef:{current:null}}));
 assert.equal((html.match(/<col\b/g)||[]).length,15);
 assert.equal((html.match(/data-row="\d+"/g)||[]).length,55);
 assert.match(html,/HOSPITAL REGIONAL DE IVAIPORÃ/);
 assert.match(html,/28\/09\/2026/);
 assert.match(html,/7,30/);
 assert.ok(!html.includes('HOSPITAL REGIONAL MARCELO REIS'));
});

test('após o sexto dia a folha mostra o atual e os cinco anteriores sem apagar histórico',()=>{
 const s=empty();s.dates=['28/09/2026','29/09/2026','30/09/2026','01/10/2026','02/10/2026','03/10/2026','04/10/2026'];s.cells={'0:13:0':'65','1:13:0':'70','6:13:0':'92'};
 const next=model.copyPrevious(s,6);
 assert.equal(next.cells['6:13:0'],'92');assert.equal(next.cells['0:13:0'],'65');
 const merged=model.mergeExtracted(next,{patient:s.patient,days:[{date:'29/09/2026',cells:{'34':['7,32','']}}]},1);
 assert.equal(merged.sheet.cells['1:34:0'],'7,32');assert.equal(merged.sheet.cells['0:13:0'],'65');
 const html=renderToStaticMarkup(createElement(FichaPrint,{patient:{id:'p1',name:s.patient,bed:s.bed},sheet:merged.sheet,windowStart:1,containerRef:{current:null}}));
 assert.equal((html.match(/<col\b/g)||[]).length,15);assert.equal((html.match(/data-row="\d+"/g)||[]).length,55);
 const dateRow=html.match(/<tr class="date-row">([\s\S]*?)<\/tr>/)?.[1]||'';
 assert.ok(!dateRow.includes('28/09/2026'));assert.match(dateRow,/29\/09\/2026/);assert.match(dateRow,/04\/10\/2026/);assert.match(html,/92/);assert.ok(!html.includes('>65</span>'));
 const restored=model.mergeBackup(empty(),merged.sheet);assert.equal(restored.sheet.dates.length,7);assert.equal(restored.sheet.cells['0:13:0'],'65');assert.equal(restored.sheet.cells['6:13:0'],'92');
});

test('Postgres salva e relê o sétimo dia com auditoria e controle de versão',async()=>{
 const {db,sql}=await pgDatabase();
 await sql.prepare('INSERT INTO patients(id,bed,name) VALUES (?,?,?)').run('p1','01','PACIENTE SINTÉTICO');
 const sheet=empty();sheet.dates=['28/09/2026','29/09/2026','30/09/2026','01/10/2026','02/10/2026','03/10/2026','04/10/2026'];sheet.cells={'0:13:0':'65','6:13:0':'92'};
 const url='https://unit.test/api/ficha?patientId=p1';const save=version=>handleSheetApi(new Request(url,{method:'POST',body:JSON.stringify({sheet,version})}),db);
 assert.equal((await save(0)).status,200);const loaded=await (await handleSheetApi(new Request(url),db)).json();assert.equal(loaded.sheet.dates.length,7);assert.equal(loaded.sheet.cells['0:13:0'],'65');assert.equal(loaded.sheet.cells['6:13:0'],'92');assert.equal(loaded.version,1);
 assert.equal((await save(0)).status,409);assert.equal((await sql.prepare("SELECT COUNT(*) AS n FROM clinical_audit WHERE action='ficha.save'").get()).n,1);
});
test('prompt externo expõe o mapa de 55 linhas e a janela da ficha sem deslocar data identificada',()=>{
 const s=empty();s.dates=['28/09/2026','29/09/2026','30/09/2026','01/10/2026','02/10/2026','03/10/2026','04/10/2026'];
 const prompt=buildExtractionPrompt(s,1);assert.match(prompt,/D2, 29\/09\/2026/);assert.match(prompt,/D7, 04\/10\/2026/);assert.match(prompt,/54 CARDIO/);assert.match(prompt,/Não invente/);
 const result=model.mergeExtracted(s,{patient:s.patient,days:[{date:'04/10/2026',cells:{'38':['','10 g/dL']}}]},1);
 assert.equal(result.sheet.cells['6:38:1'],'10 g/dL');assert.equal(result.sheet.cells['1:38:1'],undefined);
});
