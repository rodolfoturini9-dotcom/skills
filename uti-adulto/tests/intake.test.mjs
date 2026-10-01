import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs';
fs.mkdirSync('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['app/clinical/intake.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/tests/intake.mjs'});
const {extractExplicitCells,proposalFromDays,mergeFields,mergeSheet}=await import('../.sites-runtime/tests/intake.mjs');

test('texto só propõe valor com rótulo explícito e mantém unidade e sinal',()=>{
 const result=extractExplicitCells('Hb: 9,8 g/dL; Lactato: 2,1 mmol/L\nBalanço hídrico: -450 mL\nPaciente sem relato de hipotensão.\nFR: 20');
 assert.deepEqual(result,{f_38_1:'9,8 g/dL',f_45_0:'2,1 mmol/L',f_12_0:'-450 mL'});
});
test('JSON associa somente dia datado e índices válidos',()=>{
 const days=[{date:'27/09/2026',cells:{'38':['','10'],'55':['errado','']}},{date:'28/09/2026',cells:{'43':['140','4,2'],'54':['','0,04']}}];
 assert.deepEqual(proposalFromDays(days,'2026-09-28'),{f_43_0:'140',f_43_1:'4,2',f_54_1:'0,04'});
 assert.deepEqual(proposalFromDays(days,'2026-09-29'),{});
});
test('sincronização só preenche células vazias e preserva divergência',()=>{
 const proposal={f_43_0:'140',f_43_1:'4,2'};
 const clinical=mergeFields({f_43_0:'139'},proposal);
 assert.equal(clinical.data.f_43_0,'139');assert.equal(clinical.data.f_43_1,'4,2');assert.deepEqual(clinical.conflicts,['f_43_0']);
 const sheet={patient:'SINTÉTICO',admission:'',bed:'01',dates:['27/09/2026','28/09/2026','','','',''],cells:{'1:43:0':'139'}};
 const result=mergeSheet(sheet,'2026-09-28',proposal);
 assert.equal(result.day,1);assert.equal(result.sheet.cells['1:43:0'],'139');assert.equal(result.sheet.cells['1:43:1'],'4,2');assert.equal(sheet.cells['1:43:1'],undefined);
 assert.deepEqual(result.conflicts,['f_43_0']);
});
