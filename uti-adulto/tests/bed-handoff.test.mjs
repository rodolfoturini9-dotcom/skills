import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
fs.mkdirSync('.sites-runtime/tests',{recursive:true});
await build({entryPoints:['app/icu/ICUContext.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',outfile:'.sites-runtime/tests/icu-context.mjs'});
const {buildHandoff}=await import('../.sites-runtime/tests/icu-context.mjs');
test('passagem usa HMP explícita e metas do dia documentado mais recente',()=>{
 const patient={id:'s1',bed:'01',name:'PACIENTE SINTÉTICO',medicalHistory:'DM2 documentado.',diagnoses:'Hipótese registrada',summary:'Admitido em 27/09.',archived:false,respSupport:'',hemoSupport:''};
 const sheet={patient:patient.name,bed:'01',admission:'',dates:['27/09/2026','28/09/2026','','','',''],cells:{'1:13:0':'65'}};
 const snapshot={patients:[patient],dailyGoals:[{id:1,patientId:'s1',goalDate:'2026-09-27',text:'Meta antiga',completed:false},{id:2,patientId:'s1',goalDate:'2026-09-28',text:'Conferir culturas',completed:false}],tasks:[{id:3,patientId:'s1',text:'Pendente',completed:false,completedAt:''},{id:4,patientId:'s1',text:'Realizado antes',completed:true,completedAt:'2026-09-27T10:00:00Z'}],evolutions:[],customMedications:[]};
 const [entry]=buildHandoff(snapshot,{s1:{sheet,version:2}});
 assert.equal(entry.antecedents,'DM2 documentado.');assert.equal(entry.date,'2026-09-28');assert.deepEqual(entry.goals.map(x=>x.text),['Conferir culturas']);assert.equal(entry.plan,'Conferir culturas');assert.deepEqual(entry.tasks.map(x=>x.text),['Pendente']);assert.equal(entry.sheet.cells['1:13:0'],'65');
});
test('passagem aproveita evolução estruturada revisada do mesmo dia sem transportar dados antigos',()=>{
 const patient={id:'s2',bed:'02',name:'PACIENTE SINTÉTICO',medicalHistory:'',diagnoses:'',summary:'',archived:false,respSupport:'',hemoSupport:''};
 const sheet={patient:patient.name,bed:'02',admission:'',dates:['27/09/2026','28/09/2026','','','',''],cells:{'1:13:0':'65'}};
 const record=(date,diagnoses)=>({id:1,patientId:'s2',evolutionDate:date,text:'Revisado',printJson:JSON.stringify({diagnoses,antecedents:'Antecedente explícito',summary:'Resumo documentado'})});
 const snapshot={patients:[patient],dailyGoals:[],tasks:[],evolutions:[record('2026-09-28','Hipótese atual')],customMedications:[]};
 const [current]=buildHandoff(snapshot,{s2:{sheet,version:2}});
 assert.equal(current.diagnoses,'Hipótese atual');assert.equal(current.antecedents,'Antecedente explícito');
 const [old]=buildHandoff({...snapshot,evolutions:[record('2026-09-27','Hipótese antiga')]},{s2:{sheet,version:2}});
 assert.equal(old.diagnoses,'');assert.equal(old.antecedents,'');
});
test('passagem aproveita suportes, condutas e pendências revisadas do texto único',()=>{
 const patient={id:'s3',bed:'03',name:'PACIENTE SINTÉTICO',medicalHistory:'',diagnoses:'',summary:'',archived:false,respSupport:'',hemoSupport:''};
 const sheet={patient:patient.name,bed:'03',admission:'',dates:['28/09/2026','','','','',''],cells:{}};
 const evolution={id:3,patientId:'s3',evolutionDate:'2026-09-28',text:'Texto original',printJson:JSON.stringify({diagnoses:'Hipótese registrada',supports:'Ventilação documentada',devices:'CVC documentado',antibiotics:'ATB documentado',plan:'Reavaliar suporte',pending:'Conferir culturas'})};
 const [entry]=buildHandoff({patients:[patient],dailyGoals:[],tasks:[],evolutions:[evolution],customMedications:[]},{s3:{sheet,version:1}});
 assert.equal(entry.support,'Ventilação documentada · CVC documentado · ATB documentado');assert.equal(entry.plan,'Reavaliar suporte');assert.equal(entry.pendingText,'Conferir culturas');
});
