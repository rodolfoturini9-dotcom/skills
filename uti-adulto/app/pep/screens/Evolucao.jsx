import React, { useEffect, useRef, useState } from 'react';
import { useBed } from '../context/ICUContext.jsx';
import EvolucaoPrint from '../print/EvolucaoPrint.jsx';
import { printDocument } from '../print/printDocument.js';
import { gerarEvolucao, buildUserMessage } from '../services/anthropicService.js';
import { referenceDay, isoToBR, todayISO } from '../core/icuStore.js';
import { evolutionFromText } from '../services/textEvolution.js';
import {mergeDailyRecords} from '../core/dailyHistory.js';
import { ClinicalSections } from './PatientOverview.jsx';

export default function Evolucao({ onGoBeds }) {
 const {bed,update,setEvolucao}=useBed();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[showXml,setShowXml]=useState(false),[notice,setNotice]=useState('');
 const abortRef=useRef(null);const sourceRef=useRef(null);sourceRef.current=JSON.stringify(bed);const [aiPreview,setAiPreview]=useState(null);
 useEffect(()=>{setError('');setNotice('');setBusy(false);setAiPreview(null);return()=>abortRef.current?.abort();},[bed.patientId,bed.episodeId]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2500);return()=>clearTimeout(t);},[notice]);
 if(bed.status==='empty')return <div className="empty-state"><h2>Leito {bed.bedId} vago</h2><p>Admita um paciente para registrar a evolução.</p><button className="primary-btn" onClick={onGoBeds}>Mapa de leitos</button></div>;
 const date=bed.evolutionDate||bed.dates[referenceDay(bed)]||todayISO();
 const records=mergeDailyRecords(bed),record=records[date],selectedEvolution=record?.evolution||(bed.evolucao?.clinicalDate===date?bed.evolucao:null)||(!bed.evolucao?.clinicalDate&&!bed.evolutionDate?bed.evolucao:null);
 const draft=bed.evolutionDrafts?.[date]??(bed.evolutionDraft!=null&&!bed.evolutionDate?bed.evolutionDraft:selectedEvolution?.texto)??'';
 const datedBed={...bed,dates:[date,'','','','',''],cells:Object.fromEntries(Object.entries(record?.cells||{}).map(([k,v])=>['0:'+k,v]))};
 const {xml,hasData}=buildUserMessage(datedBed,{notasClinicas:bed.notesByDate?.[date]||''});
 const save=()=>{if(!draft.trim())return;setEvolucao(evolutionFromText(draft,selectedEvolution));update({evolutionDraft:null,evolutionDrafts:{...bed.evolutionDrafts,[date]:null}});setNotice('Evolução salva.');};
 const generate=async()=>{const generationSource=sourceRef.current;setError('');setBusy(true);const controller=new AbortController();abortRef.current=controller;try{const evo=await gerarEvolucao(bed,{signal:controller.signal,date});if(!controller.signal.aborted){if(sourceRef.current!==generationSource)throw Error('Os registros mudaram. Gere novamente.');setAiPreview({evo,source:generationSource});}}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}};
 const copy=async()=>{try{await navigator.clipboard.writeText(selectedEvolution.texto);setNotice('Texto copiado.');}catch{setError('Não foi possível copiar automaticamente. Selecione o texto no campo e copie.');}};
 return <div className="evolution-workspace">
  <section className="editor-card no-print"><div className="section-heading"><h2>Registrar evolução</h2><span className="muted">{draft.length.toLocaleString('pt-BR')} caracteres</span></div><p className="muted" style={{margin:'8px 0 16px'}}>Cole ou digite a evolução em um único campo. Títulos como # EXAME FÍSICO organizam a visualização.</p>
   {selectedEvolution&&!selectedEvolution.clinicalDate&&<p className="inline-notice">Registro anterior sem data assistencial vinculada. Confira a data antes de salvar.</p>}
   <label>Data da evolução<input type="date" aria-label="Data da evolução" disabled={busy} value={date} onChange={e=>{if(e.target.value)update({evolutionDate:e.target.value});}}/></label>
   <label htmlFor="evolution-text">Texto da evolução médica</label><textarea id="evolution-text" value={draft} onChange={e=>update({evolutionDrafts:{...bed.evolutionDrafts,[date]:e.target.value}})} rows={10} placeholder="Insira a evolução médica…"/>
   <div className="editor-actions"><button className="primary-btn" onClick={save} disabled={!draft.trim()||busy}>Salvar e organizar</button>{selectedEvolution&&<><button className="secondary-btn" onClick={copy}>Copiar texto</button><button className="secondary-btn" onClick={()=>printDocument('evolucao')}>Imprimir / PDF A4</button></>}<small>Revise o conteúdo antes de assinar</small></div>
   {notice&&<p className="inline-notice" role="status">{notice}</p>}
  </section>
  <details className="editor-card no-print"><summary className="text-btn">Gerar evolução por IA a partir da ficha diária</summary><div className="muted" style={{margin:'10px 0'}}>Referência: {isoToBR(date)}. Somente os dados registrados nesta data serão enviados. A geração requer conexão e servidor configurado.</div><label htmlFor="bed-notes">Notas à beira do leito</label><textarea id="bed-notes" value={bed.notesByDate?.[date]||''} onChange={e=>update({notesByDate:{...bed.notesByDate,[date]:e.target.value}})} rows={4} placeholder="Exame físico, intercorrências, antecedentes…"/>
   <div className="editor-actions"><button className="primary-btn" disabled={busy||!hasData} onClick={generate}>{busy?'Gerando…':'Gerar evolução por IA'}</button>{busy&&<button className="secondary-btn" onClick={()=>{abortRef.current?.abort();setBusy(false);}}>Cancelar</button>}<button className="secondary-btn" onClick={()=>setShowXml(v=>!v)}>{showXml?'Ocultar dados':'Revisar dados enviados'}</button></div>
   {showXml&&<pre style={{whiteSpace:'pre-wrap',fontSize:12,maxHeight:300,overflow:'auto',marginTop:16}}>{xml}</pre>}
  </details>
  {aiPreview&&<section className="editor-card no-print"><h2>Revisar evolução gerada</h2><textarea aria-label="Revisão da evolução gerada" rows={12} value={aiPreview.evo.texto} onChange={e=>setAiPreview(p=>({...p,evo:{...p.evo,texto:e.target.value,payload:evolutionFromText(e.target.value).payload}}))}/><button className="primary-btn" onClick={()=>{if(sourceRef.current!==aiPreview.source){setAiPreview(null);setError('Paciente, data ou registros mudaram. Gere novamente.');return;}setEvolucao(aiPreview.evo);setAiPreview(null);}}>Aplicar evolução revisada</button></section>}
  {error&&<p role="alert" className="inline-notice no-print" style={{color:'#a53440'}}>{error}</p>}
  {selectedEvolution&&<section className="no-print"><div className="section-heading" style={{marginBottom:16}}><h2>Evolução organizada</h2><span className="muted">{new Date(selectedEvolution.editadoEm||selectedEvolution.geradoEm).toLocaleString('pt-BR')}</span></div><ClinicalSections text={selectedEvolution.texto}/></section>}
  {selectedEvolution&&<div className="print-measure" aria-hidden="true"><EvolucaoPrint bed={bed} evolucao={selectedEvolution}/></div>}
 </div>;
}
