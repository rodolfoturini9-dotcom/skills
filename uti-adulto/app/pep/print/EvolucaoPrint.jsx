import React, { forwardRef } from 'react';
import { toPrintModel } from '../services/evolucaoSchema.js';
import { splitClinicalText } from '../services/textEvolution.js';
import { isoToBR,stayDays,todayISO } from '../core/icuStore.js';

// Evolução médica – UTI Adulto · A4 retrato, 1 página (página 199,5 × 286,5 mm úteis; @page margin 5 mm).
const AZUL = '#0b4777', BORDA = '#c7d3dd';

function Section({ s }) {
  return (
    <section style={{ border: `1px solid ${BORDA}`, borderRadius: 5, marginBottom: 8, breakInside: 'avoid', overflowWrap:'anywhere' }}>
      <div style={{ background: `linear-gradient(90deg, ${AZUL}, #2d6b95)`, color: '#fff', padding: '4px 8px', fontWeight: 700, fontSize: 12.5 }}>{s.title}</div>
      <div style={{ padding: s.kind === 'table' ? 0 : '6px 9px', fontSize: 12, lineHeight: 1.4 }}>
        {s.kind === 'list' && <ul style={{ margin: 0, paddingLeft: 16 }}>{s.data.map((x, i) => <li key={i} style={{ margin: '1px 0 3px' }}>{x}</li>)}</ul>}
        {s.kind === 'olist' && <ol style={{ margin: 0, paddingLeft: 18 }}>{s.data.map((x, i) => <li key={i} style={{ margin: '1px 0 3px' }}>{x}</li>)}</ol>}
        {s.kind === 'kv' && s.data.map(([k, v]) => <div key={k} style={{ margin: '1px 0 2px' }}><b>{k}:</b> {v}</div>)}
        {s.kind === 'mixed' && (
          <>
            {s.data.text && <p style={{ margin: '0 0 4px' }}>{s.data.text}</p>}
            {!!s.data.list.length && <ul style={{ margin: 0, paddingLeft: 16 }}>{s.data.list.map((x, i) => <li key={i} style={{ margin: '1px 0 3px' }}>{x}</li>)}</ul>}
          </>
        )}
        {s.kind === 'table' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {s.data.map(([k, v], i) => (
                <tr key={k}>
                  <th style={{ width: '32%', background: '#f3f6f8', textAlign: 'left', padding: '3px 6px', borderBottom: i < s.data.length - 1 ? '1px solid #d8e0e7' : 0 }}>{k}</th>
                  <td style={{ padding: '3px 6px', borderBottom: i < s.data.length - 1 ? '1px solid #d8e0e7' : 0 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

const EvolucaoPrint = forwardRef(function EvolucaoPrint({ bed, evolucao, id = 'print-evolucao' }, contentRef) {
  const p = evolucao?.payload || {};
  let { col1, col2 } = toPrintModel(p);
  if(evolucao?.source === 'manual') { const sections=splitClinicalText(evolucao.texto).map(s=>({title:s.title,kind:'list',data:s.lines})); col1=sections; col2=[]; }
  const gerado = evolucao?.geradoEm ? new Date(evolucao.geradoEm) : null;
  const data = isoToBR(evolucao?.clinicalDate) || p.registro?.data_evolucao || (gerado ? gerado.toLocaleDateString('pt-BR') : '');
  const hora = p.registro?.hora_evolucao || (gerado ? gerado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  const clinicalDate=evolucao?.clinicalDate||todayISO();
  const dih = [bed.hospitalAdmissionDate && `DIH ${stayDays(bed.hospitalAdmissionDate,clinicalDate)}`,bed.admissionDate && `DI-UTI ${stayDays(bed.admissionDate,clinicalDate)}`].filter(Boolean).join(' · ');
  return (
    <div id={id} style={{ width: '199.5mm', minHeight: '286.5mm', background: '#fff', color: '#17212b', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div ref={contentRef} style={{ width: '199.5mm', transformOrigin: 'top left' }}>
        <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, color: AZUL, marginBottom: 4 }}>Hospital Regional de Ivaiporã</div>
        <div style={{ background: AZUL, color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: 700, padding: '5px 10px', borderRadius: 3 }}>EVOLUÇÃO MÉDICA – UTI ADULTO</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', margin: '8px 0', background: '#eef2f5', border: `1px solid ${BORDA}`, borderRadius: 6, overflow: 'hidden' }}>
          {[['Paciente', bed.patientName], ['Leito', bed.bedId], ['Admissão UTI', [isoToBR(bed.admissionDate), dih].filter(Boolean).join(' · ')]].map(([l, v], i) => (
            <div key={l} style={{ padding: '6px 12px', borderRight: i < 2 ? `1px solid ${BORDA}` : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334250' }}>{l}:</div>
              <div style={{ fontSize: i === 2 ? 13 : 17, fontWeight: 700, color: '#0e2f50' }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="evolution-print-columns" style={{columns:2,columnGap:12}}>{[...col1,...col2].map((s,i)=><Section key={i} s={s}/>)}</div>
        <footer style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 12, alignItems: 'end', fontSize: 10 }}>
          <div>Data da evolução: <b>{data}</b>{p.registro?.hora_evolucao&&<> · Hora assistencial: <b>{hora}</b></>}<br/>Registro salvo: {evolucao?.editadoEm||evolucao?.geradoEm?new Date(evolucao.editadoEm||evolucao.geradoEm).toLocaleString('pt-BR'):''}</div>
          <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #333', paddingTop: 4, marginTop: 22 }}>Assinatura e Carimbo Médico</div></div>
        </footer>
      </div>
    </div>
  );
});

export default EvolucaoPrint;
