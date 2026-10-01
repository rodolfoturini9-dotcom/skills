import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyBed,deriveHandoff,autoHandoff,deriveHRIVPassagem,createInitialState} from '../app/pep/core/icuStore.js';
import {automaticHandoff} from '../app/pep/core/handoffGeneration.js';

const evo=(texto,payload)=>({texto,payload,clinicalDate:undefined});
function bed(extra={}){return {...createEmptyBed('01'),patientId:'p1',episodeId:'p1',patientName:'PACIENTE SINTÉTICO',status:'occupied',dates:['2026-09-30','','','','',''],...extra};}

test('preenche HD, HMP, HMA, CD e pendências a partir do texto da evolução da data de referência',()=>{
 const b=bed({cells:{'0:31:0':'VCV'},dailyRecords:{'2026-09-30':{date:'2026-09-30',cells:{'31:0':'VCV'},evolution:evo('# DIAGNÓSTICOS:\nChoque séptico\nIRpA\n# ANTECEDENTES:\nHAS\n# HMA:\nFebre há 3 dias\n# CONDUTAS:\nManter noradrenalina\n# PENDÊNCIAS:\nHemoculturas')}}});
 const h=deriveHandoff(b);
 assert.deepEqual(h.diagnosticos,['Choque séptico','IRpA']);
 assert.deepEqual(h.antecedentes_historia,['HAS']);
 assert.deepEqual(h.historia_atual,['Febre há 3 dias']);
 assert.deepEqual(h.condutas,['Manter noradrenalina']);
 assert.deepEqual(h.pendencias,['Hemoculturas']);
 assert.equal(h.origem.diagnosticos,'automatico');
 assert.ok(h.situacao.some(s=>s.titulo==='SUPORTES'&&s.itens.some(i=>/VCV/.test(i))),'HMA / SUPORTES vem da ficha D-0');
});

test('payload estruturado prevalece e entradas manuais prevalecem sobre o automático',()=>{
 const b=bed({dailyRecords:{'2026-09-30':{date:'2026-09-30',cells:{},evolution:evo('# CONDUTAS:\nTexto',{diagnosticos_atuais:['Pneumonia'],condutas:['Antibiótico D2']})}}});
 assert.deepEqual(deriveHandoff(b).condutas,['Antibiótico D2']);
 b.handoff={...b.handoff,diagnosticos:['DIAGNÓSTICO MANUAL']};
 const h=deriveHandoff(b);assert.deepEqual(h.diagnosticos,['DIAGNÓSTICO MANUAL']);assert.equal(h.origem.diagnosticos,'manual');
});

test('HD e HMP vêm de evolução anterior; condutas e pendências de outro dia não são transportadas',()=>{
 const b=bed({dailyRecords:{'2026-09-29':{date:'2026-09-29',cells:{},evolution:evo('# DIAGNÓSTICOS:\nAVC isquêmico\n# ANTECEDENTES:\nFA\n# CONDUTAS:\nPlano antigo\n# PENDÊNCIAS:\nPendência antiga')}}});
 const a=autoHandoff(b);
 assert.deepEqual(a.diagnosticos,['AVC isquêmico']);assert.deepEqual(a.antecedentes_historia,['FA']);
 assert.deepEqual(a.condutas,[]);assert.deepEqual(a.pendencias,[]);
});

test('sem evolução: usa resumo da internação e cadastro, sem inventar conteúdo',()=>{
 const b=bed({hospitalizationSummary:{sections:{diagnosticos:'Pancreatite aguda',situacao_atual:'Estável em ar ambiente'}},legacyPatient:{medical_history:'DM2\nObesidade'}});
 const a=autoHandoff(b);
 assert.deepEqual(a.diagnosticos,['Pancreatite aguda']);assert.deepEqual(a.antecedentes_historia,['DM2','Obesidade']);assert.deepEqual(a.historia_atual,['Estável em ar ambiente']);
 const vazio=autoHandoff(bed());for(const k of ['diagnosticos','antecedentes_historia','historia_atual','condutas','pendencias'])assert.deepEqual(vazio[k],[]);
 assert.equal(automaticHandoff(b).diagnosticos[0],'Pancreatite aguda');
});

test('passagem inclui somente leitos ocupados com dados automáticos',()=>{
 const s=createInitialState();s.beds['03']={...bed({bedId:'03'}),bedId:'03',dailyRecords:{'2026-09-30':{date:'2026-09-30',cells:{},evolution:evo('# CONDUTAS:\nExtubar se possível')}}};
 const p=deriveHRIVPassagem(s,'2026-09-30');assert.equal(p.pacientes.length,1);assert.equal(p.data,'30/09/2026');assert.deepEqual(p.pacientes[0].condutas,['Extubar se possível']);
});
