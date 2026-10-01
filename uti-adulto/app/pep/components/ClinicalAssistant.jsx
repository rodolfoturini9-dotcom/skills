import React, { useRef, useState } from 'react';
import { aiFetch } from '../services/aiJobs.js';

const SUGESTOES = [
  'Resuma a evolução das últimas 72 horas com datas.',
  'Quais suportes, antibióticos e dispositivos estão registrados hoje e desde quando?',
  'Liste exames laboratoriais com tendência (creatinina, lactato, Hb, leucócitos) por data.',
  'Há pendências ou condutas registradas sem conclusão no checklist?',
];
const TOOL_LABELS = { identificacao: 'Identificação', datas_registradas: 'Datas registradas', ficha_do_dia: 'Ficha diária', evolucao_do_dia: 'Evoluções', passagem_de_plantao: 'Passagem', resumo_internacao: 'Resumo da internação', prescricoes: 'Prescrições' };

// Assistente clínico (Claude): responde perguntas consultando somente os registros deste paciente.
export default function ClinicalAssistant({ bed }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const abort = useRef(null);
  const ask = async (q = question) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true); setError(''); setProgress('Enviando…');
    const controller = new AbortController(); abort.current = controller;
    try {
      const r = await aiFetch('/api/ai/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ bedId: bed.bedId, patientId: bed.patientId, episodeId: bed.episodeId, question: text }) },
        { onStatus: s => setProgress(s.status === 'queued' ? 'Na fila…' : `Consultando registros e redigindo resposta… ${s.seconds} s`) });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || 'Falha no assistente.');
      setHistory(h => [{ question: text, answer: data.answer, tools: data.toolsUsed || [], model: data.model, at: new Date() }, ...h].slice(0, 10));
      setQuestion('');
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); }
    finally { setBusy(false); setProgress(''); }
  };
  const copy = text => navigator.clipboard?.writeText(text).catch(() => {});
  return (
    <section className="editor-card ai-assistant">
      <div className="section-heading"><h2>Assistente clínico · IA (Claude)</h2><span className="muted">Consulta somente os registros deste paciente; não altera o prontuário.</span></div>
      <div className="ai-suggestions">{SUGESTOES.map(s => <button key={s} type="button" className="secondary-btn" disabled={busy} onClick={() => ask(s)}>{s}</button>)}</div>
      <label className="ai-question">Pergunta
        <textarea rows={3} value={question} maxLength={4000} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(); }} placeholder="Ex.: Qual a evolução do balanço hídrico e da diurese desde a admissão?" />
      </label>
      <div className="editor-actions">
        <button type="button" className="primary-btn" disabled={busy || !question.trim()} onClick={() => ask()}>{busy ? 'Consultando…' : 'Perguntar'}</button>
        {busy && <button type="button" className="secondary-btn" onClick={() => abort.current?.abort()}>Cancelar</button>}
        {progress && <span role="status" className="muted">{progress}</span>}
      </div>
      {error && <p role="alert" className="inline-notice">{error}</p>}
      {history.map((h, i) => (
        <article key={i} className="ai-answer">
          <p className="ai-q"><b>Pergunta:</b> {h.question}</p>
          <div className="ai-a">{h.answer.split('\n').map((line, j) => <p key={j}>{line}</p>)}</div>
          <p className="muted">Fontes consultadas: {[...new Set(h.tools)].map(t => TOOL_LABELS[t] || t).join(', ') || 'nenhuma'} · {h.model} · {h.at.toLocaleTimeString('pt-BR')}
            <button type="button" className="text-btn" onClick={() => copy(h.answer)}>Copiar</button></p>
        </article>
      ))}
      <p className="muted ai-disclaimer">Conteúdo gerado por IA para apoio ao médico: confira os dados nas fontes antes de registrar ou decidir condutas.</p>
    </section>
  );
}
