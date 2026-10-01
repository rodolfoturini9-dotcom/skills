import React, { forwardRef } from 'react';
import { chunk } from './fitPassagem.js';

// Template anexado: A4 paisagem, área útil conservadora 290×203mm (@page margin 3mm), 3 pacientes/página, 6 colunas proporcionais.
const COLS = '12.6% 13.5% 16% 15.3% 22.8% 19.8%';
const BLUE = '#9bc9e5';
const S = {
  page: { width: '290mm', height: '203mm', padding: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', breakAfter: 'page', pageBreakAfter: 'always', breakInside: 'avoid', fontFamily: 'Arial, Helvetica, sans-serif', color: '#172d43', boxSizing: 'border-box' },
  title: { flex: 'none', padding: '1.5mm 2mm', minHeight: '12mm', borderRadius: '2mm', background: '#123b60', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.1mm', letterSpacing: '.025em', textAlign: 'center' },
  list: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '2mm', paddingTop: '2mm' },
  row: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: COLS, border: `1px solid ${BLUE}`, borderRadius: '1.6mm', overflow: 'hidden' },
  cell: { minWidth: 0, borderRight: `1px solid ${BLUE}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cellTitle: { flex: 'none', background: '#15618a', color: '#fff', textAlign: 'center', fontSize: 9, fontWeight: 700, lineHeight: '15px' },
  body: { flex: 1, minHeight: 0, padding: '4px 5px', fontSize: 'var(--row-font, 8.5px)', lineHeight: 1.13, overflowWrap: 'anywhere' },
  bullet: { display: 'flex', gap: 3, margin: '0 0 2px' },
  sec: { margin: '2px 0 1px', color: '#123b60', fontWeight: 800, fontSize: 'calc(var(--row-font, 8.5px) + .3px)' },
};

const Bullets = ({ items }) => (items || []).map((t, i) => (
  <div key={i} style={S.bullet}><span style={{ color: '#165782' }}>•</span><span>{t}</span></div>
));

function Cell({ label, children, last, bodyStyle }) {
  return (
    <section style={{ ...S.cell, ...(last ? { borderRight: 0 } : null) }}>
      <div style={S.cellTitle}>{label}</div>
      <div data-fit-box style={{ ...S.body, ...bodyStyle }}>{children}</div>
    </section>
  );
}

function PatientRow({ p }) {
  return (
    <article data-fit-row={`Leito ${p.leito} · ${p.nome}`} style={S.row}>
      <Cell label="LEITO / IDENTIFICAÇÃO" bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 6, lineHeight: 1.19 }}>
        <div style={{ alignSelf: 'flex-start', background: '#165f8e', color: '#fff', borderRadius: 5, fontSize: 17, fontWeight: 800, lineHeight: 1, padding: '7px 8px' }}>{p.leito}</div>
        <div style={{ flex: 1, maxHeight: '25%' }} />
        <div style={{ textTransform: 'uppercase', fontSize: 'calc(var(--row-font, 8.5px) + 2.2px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 3, overflowWrap: 'anywhere' }}>{p.nome}</div>
        {p.idade && <div style={{ fontSize: 'calc(var(--row-font, 8.5px) + .5px)', marginBottom: 5 }}>{p.idade}</div>}
        {p.internacao && <div>{p.internacao}</div>}
        <div style={{ flex: 1, maxHeight: '25%' }} />
      </Cell>
      <Cell label="HD"><Bullets items={p.diagnosticos} /></Cell>
      <Cell label="HMP"><Bullets items={p.antecedentes_historia} /></Cell>
      <Cell label="HMA / SUPORTES">
        {(p.situacao || []).map((s) => (
          <React.Fragment key={s.titulo}><div style={S.sec}>{s.titulo}</div><Bullets items={s.itens} /></React.Fragment>
        ))}
      </Cell>
      <Cell label="CD / METAS"><Bullets items={p.condutas} /></Cell>
      <Cell label="PENDÊNCIAS" last><Bullets items={p.pendencias} /></Cell>
    </article>
  );
}

function CheckCard({ p }) {
  const items = p.checklist || [];
  return (
    <article data-fit-card={`UTI-${p.leito}`} style={{ minHeight: 0, border: `1px solid ${BLUE}`, borderRadius: '1.6mm', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', background: '#155c83', color: '#fff', padding: '4px 7px', fontSize: 10.5, lineHeight: 1.1, fontWeight: 800 }}>{p.nome} | UTI-{p.leito}</div>
      <div data-fit-box style={{ flex: 1, minHeight: 0, padding: '3px 5px', fontSize: 'var(--check-font, 8.3px)', lineHeight: 1.12 }}>
        
        {items.map((c, i) => {
          const done = c.status === 'realizado';
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 4, padding: '1px 2px', borderRadius: 2, background: i % 2 ? 'transparent' : '#f1f6fa' }}>
              <span style={{ flex: 'none', fontWeight: 800, whiteSpace: 'nowrap', color: done ? '#177b49' : '#ad6300' }}>{done ? '✓ REALIZADO:' : '! PENDENTE:'}</span>
              <span style={{ overflowWrap: 'anywhere' }}>{c.texto}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

const PassagemPrint = forwardRef(function PassagemPrint({ passagem }, ref) {
  const { pacientes, data, unidade, resumo } = passagem;
  const pct = (n) => (resumo.total ? Math.round((n / resumo.total) * 100) : 0);
  return (
    <div ref={ref} id="passagem-pages">
      {chunk(pacientes, 3).map((batch, i) => (
        <section key={i} style={S.page} data-page>
          <header style={S.title}><b style={{ fontSize: 18, lineHeight: 1.04 }}>PASSAGEM DE PLANTÃO - {unidade} | {data}</b></header>
          <div style={S.list}>{batch.map((p) => <PatientRow key={p.leito} p={p} />)}</div>
        </section>
      ))}
      <section style={{ ...S.page, breakAfter: 'auto', pageBreakAfter: 'auto' }} data-page>
        <header style={{ ...S.title, minHeight: '14mm' }}>
          <b style={{ fontSize: 18, lineHeight: 1.04 }}>PASSAGEM DE PLANTÃO - CHECKLIST DE PLANOS E METAS</b>
          <small style={{ fontSize: 10, lineHeight: 1.1 }}>{unidade} | {data} | Situação das ações até o momento da passagem</small>
        </header>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: `repeat(${Math.max(1, Math.ceil(pacientes.length / 2))}, minmax(0,1fr))`, gap: '2mm', paddingTop: '2mm' }}>
          {pacientes.map((p) => <CheckCard key={p.leito} p={p} />)}
        </div>
        <footer style={{ flex: 'none', marginTop: '2mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 10px', border: `1px solid ${BLUE}`, borderRadius: '1.5mm', fontSize: 9.5, background: '#edf5f9' }}>
          <b style={{ color: '#123b60' }}>RESUMO OPERACIONAL</b>
          <span>Total de ações: {resumo.total}</span>
          <span>Concluídas: {resumo.realizados}/{resumo.total} ({pct(resumo.realizados)}%)</span>
          <span>Pendências: {resumo.pendentes}/{resumo.total} ({pct(resumo.pendentes)}%)</span>
          <span>Legenda: <b style={{ color: '#177b49' }}>✓ REALIZADO</b> | <b style={{ color: '#ad6300' }}>! PENDENTE</b></span>
        </footer>
      </section>
    </div>
  );
});

export default PassagemPrint;
