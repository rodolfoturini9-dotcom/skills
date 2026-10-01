import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useICU } from '../context/ICUContext.jsx';
import { BottomSheet } from '../components/BottomSheet.jsx';
import PassagemPrint from '../print/PassagemPrint.jsx';
import { fitPassagem } from '../print/fitPassagem.js';
import { HandoffGenerator } from '../components/HandoffGenerator.jsx';
import { printDocument } from '../print/printDocument.js';

const LISTS = [
  ['diagnosticos', 'HD · Diagnósticos'],
  ['antecedentes_historia', 'HMP · Antecedentes e história'],
  ['historia_atual', 'HMA · História e intercorrências'],
  ['condutas', 'CD / Metas'],
  ['pendencias', 'Pendências'],
];

export default function Passagem({ onGoBeds }) {
  const { passagem } = useICU();
  const printRef = useRef(null);
  const [failures, setFailures] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [openBed, setOpenBed] = useState(null);
  const { pacientes, resumo } = passagem;

  // Reajusta a cada mudança de dados: o aviso de excesso aparece antes de imprimir.
  useLayoutEffect(() => {
    if (printRef.current) { const fit=fitPassagem(printRef.current); setFailures(fit.failures);setPageCount(fit.pages); }
  }, [passagem]);

  useEffect(() => {
    const onBP = () => printRef.current && fitPassagem(printRef.current);
    window.addEventListener('beforeprint', onBP);
    return () => window.removeEventListener('beforeprint', onBP);
  }, []);

  const pages = pageCount;
  const imprimir = () => printDocument('passagem', { before: () => fitPassagem(printRef.current) });

  if (!pacientes.length) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#c7d3dd] bg-white p-5 text-base text-slate-600 print:hidden">
        Nenhum leito ocupado. Admita pacientes no <button type="button" onClick={onGoBeds} className="min-h-11 font-bold text-[#15618a]">mapa de leitos</button>.
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl screen-width gap-3">
      <section className="grid gap-3 rounded-2xl border border-[#c7d3dd] bg-white p-4 print:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold text-[#123b60]">{pacientes.length} pacientes · {pages} {pages > 1 ? 'páginas' : 'página'} incluindo checklist</div>
            <div className="text-sm text-slate-500">A4 paisagem · margens de 3 mm · até 3 leitos por página</div>
          </div>
          <div className="text-right text-sm"><b className="text-[#177b49]">{resumo.realizados}</b>/{resumo.total} ações · {resumo.pct}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#fbe9d0]"><div className="h-full bg-[#177b49]" style={{ width: `${resumo.pct}%` }} /></div>
        <button type="button" onClick={imprimir} className="min-h-12 rounded-xl bg-[#123b60] text-base font-bold text-white active:bg-[#0d2c48]">Imprimir A4 paisagem</button>
      </section>

      <HandoffGenerator />

      {!!failures.length && (
        <div role="status" className="rounded-xl border border-[#e6c08e] bg-[#fdf3e3] p-3 text-sm text-[#7a4600] print:hidden">
          <b>Conteúdo extenso:</b> {failures.join('; ')}. A impressão usará páginas adicionais para preservar o texto.
        </div>
      )}

      <ul className="grid gap-2 print:hidden">
        {pacientes.map((p) => {
          const done = p.checklist.filter((c) => c.status === 'realizado').length;
          return (
            <li key={p.leito}>
              <button type="button" onClick={() => setOpenBed(p.leito)} className="flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-[#9bc9e5] bg-white p-3 text-left active:bg-slate-50">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#165f8e] text-lg font-extrabold text-white">{p.leito}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold">{p.nome}</span>
                  <span className="block truncate text-[13px] text-slate-500">{[p.idade, p.internacao].filter(Boolean).join(' · ')}</span>
                  <span className="mt-0.5 block text-[13px] text-slate-600">HD {p.diagnosticos.length} · CD {p.condutas.length} · Pend. {p.pendencias.length}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ${p.checklist.length && done === p.checklist.length ? 'bg-[#e3f3ea] text-[#177b49]' : 'bg-[#fdf3e3] text-[#ad6300]'}`}>{done}/{p.checklist.length}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Folhas medidas fora da tela (fit precisa de layout real); visíveis somente na impressão. */}
      <div aria-hidden="true" className="print-measure">
        <PassagemPrint ref={printRef} passagem={passagem} />
      </div>

      <BedHandoffSheet bedId={openBed} onClose={() => setOpenBed(null)} />
    </div>
  );
}

function BedHandoffSheet({ bedId, onClose }) {
  const { state, actions, passagem } = useICU();
  const p = useMemo(() => passagem.pacientes.find((x) => x.leito === bedId), [passagem, bedId]);
  const [drafts, setDrafts] = useState({});
  const [novo, setNovo] = useState('');
  const [lastId, setLastId] = useState(null);
  if (bedId !== lastId) {
    setLastId(bedId);
    setNovo('');
    setDrafts(p ? Object.fromEntries(LISTS.map(([k]) => [k, (p[k] || []).join('\n')])) : {});
  }
  const commit = (k) => actions.updateHandoff(bedId, { [k]: (drafts[k] || '').split('\n').map((s) => s.trim()).filter(Boolean) });
  const add = () => { actions.addCheck(bedId, novo); setNovo(''); };
  const fromPend = () => {
    const have = new Set((p?.checklist || []).map((c) => c.texto.toLowerCase()));
    (p?.pendencias || []).filter((t) => !have.has(t.toLowerCase())).forEach((t) => actions.addCheck(bedId, t));
  };
  const field = 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-[#15618a] focus:outline-none focus:ring-2 focus:ring-[#15618a]/25';

  return (
    <BottomSheet open={!!bedId && !!p} onClose={onClose} title={p ? `Leito ${p.leito} · ${p.nome}` : ''} subtitle={p ? [p.idade, p.internacao].filter(Boolean).join(' · ') : ''}>
      {p && (
        <div className="grid gap-5">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#15618a]">Checklist operacional</h3>
              {!!p.pendencias.length && <button type="button" onClick={fromPend} className="min-h-11 px-1 text-sm font-bold text-[#15618a]">Pendências → checklist</button>}
            </div>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              {p.checklist.map((c) => {
                const done = c.status === 'realizado';
                return (
                  <li key={c.id} className="flex items-center gap-2 pr-1">
                    <button type="button" onClick={() => actions.toggleCheck(bedId, c.id)} className="flex min-h-12 flex-1 items-center gap-3 px-3 py-2 text-left">
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[12px] font-extrabold ${done ? 'bg-[#e3f3ea] text-[#177b49]' : 'bg-[#fdf3e3] text-[#ad6300]'}`}>{done ? '✓ REALIZADO' : '! PENDENTE'}</span>
                      <span className="text-[15px] leading-snug">{c.texto}</span>
                    </button>
                    <button type="button" aria-label="Remover item" onClick={() => actions.removeCheck(bedId, c.id)} className="grid min-h-11 min-w-11 place-items-center text-xl text-slate-400">×</button>
                  </li>
                );
              })}
              {!p.checklist.length && <li className="px-3 py-3 text-[15px] italic text-slate-500">Sem ações registradas.</li>}
            </ul>
            <div className="mt-2 flex gap-2">
              <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Nova ação" enterKeyHint="done" className={`${field} mt-0 min-h-11 flex-1`} />
              <button type="button" onClick={add} disabled={!novo.trim()} className="min-h-11 rounded-lg bg-[#123b60] px-4 text-base font-bold text-white disabled:opacity-40">Adicionar</button>
            </div>
          </section>

          {!!p.situacao.length && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#15618a]">HMA / Suportes <span className="font-normal normal-case text-slate-500">· evolução e ficha de referência</span></h3>
              <div className="mt-1.5 grid gap-1.5 rounded-xl bg-[#f1f6fa] p-3 text-[15px]">
                {p.situacao.map((s) => <div key={s.titulo}><b className="text-[#123b60]">{s.titulo}:</b> {s.itens.join(' · ')}</div>)}
              </div>
            </section>
          )}

          {LISTS.map(([k, label]) => (
            <label key={k} className="text-sm font-bold uppercase tracking-wide text-[#15618a]">
              {label} <span className="font-normal normal-case text-slate-500">· um item por linha</span>
              <textarea rows={Math.min(8, Math.max(3, (drafts[k] || '').split('\n').length + 1))} value={drafts[k] || ''} onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))} onBlur={() => commit(k)} className={`${field} normal-case tracking-normal`} />
            </label>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
