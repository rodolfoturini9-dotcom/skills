'use client';

import {backupState} from './core/backupMerge.js';
import React, { useState } from 'react';
import { ICUProvider, useICU } from './context/ICUContext.jsx';
import Layout from './components/Layout.jsx';
import { BottomSheet, ActionSheet, ConfirmSheet } from './components/BottomSheet.jsx';
import { filledCount, referenceDay, deriveHandoff } from './core/icuStore.js';
import FichaDiaria from './screens/FichaDiaria.jsx';
import Evolucao from './screens/Evolucao.jsx';
import Passagem from './screens/Passagem.jsx';
import Prescricao from './screens/Prescricao.jsx';
import PatientOverview from './screens/PatientOverview.jsx';

const TITLES = { prescricao: 'Prescrição e diluições', paciente: 'Painel do paciente', leitos: 'Mapa de leitos', ficha: 'Ficha diária · 6 dias', evolucao: 'Evolução médica', passagem: 'Passagem de plantão' };

export default function App({initialRoute = "leitos"}) {
  return (
    <ICUProvider>
      <Shell initialRoute={initialRoute} />
    </ICUProvider>
  );
}

function Shell({initialRoute}) {
  const [route, setRoute] = useState(initialRoute);
  return (
    <Layout route={route} onNavigate={setRoute} title={TITLES[route]}>
      {route === 'leitos' && <BedBoard onOpenFicha={() => setRoute('ficha')} onOpenPatient={() => setRoute('paciente')} />}
      {route === 'paciente' && <PatientOverview onNavigate={setRoute} />}
      {route === 'prescricao' && <Prescricao onGoBeds={() => setRoute('leitos')} />}
      {route === 'ficha' && <FichaDiaria onGoBeds={() => setRoute('leitos')} />}
      {route === 'evolucao' && <Evolucao onGoBeds={() => setRoute('leitos')} />}
      {route === 'passagem' && <Passagem onGoBeds={() => setRoute('leitos')} />}
    </Layout>
  );
}

export const STATUS_UI = {
  occupied: { label: 'Ocupado', dot: 'bg-[#15618a]', ring: 'border-[#9bc9e5]' },
  critical: { label: 'Crítico', dot: 'bg-[#b3261e]', ring: 'border-[#e3a39e]' },
  isolation: { label: 'Isolamento', dot: 'bg-[#ad6300]', ring: 'border-[#e6c08e]' },
  empty: { label: 'Vago', dot: 'bg-slate-300', ring: 'border-dashed border-slate-300' },
};

function BedBoard({ onOpenFicha, onOpenPatient }) {
  const { state, actions, bedIds, census, exportBackup } = useICU();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [importPending, setImportPending] = useState(null);
  const visibleBeds = bedIds.filter(id => { const b=state.beds[id]; return (filter==='all'||(filter==='occupied'?b.status!=='empty':filter==='isolation'?(b.isIsolation||b.status==='isolation')&&b.status!=='empty':b.status===filter)) && `${id} ${b.patientName}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')); });
  const pendingCount = bedIds.reduce((n,id)=>n+state.beds[id].handoff.checklist.filter(c=>c.status==='pendente').length,0);
  const [menuBed, setMenuBed] = useState(null);
  const [importMsg, setImportMsg] = useState('');
  const onImport = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { const data=backupState(JSON.parse(await f.text()));setImportPending(data); }
    catch(e) { setImportMsg(e.message||'Arquivo inválido.'); }
    setTimeout(() => setImportMsg(''), 2500);
  };
  const [editBed, setEditBed] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const b = menuBed && state.beds[menuBed];

  return (
    <>
      <div className="census-grid">
        {[['Ocupados',`${census.occupied} / ${census.total}`,'occupied','Leitos em uso'],['Críticos',census.critical,'critical','Marcação assistencial'],['Isolamento',census.isolation,'isolation','Leitos sinalizados'],['Pendências',pendingCount,'tasks','Ações do checklist']].map(([label,value,tone,detail])=><section key={label} className={`census-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></section>)}
      </div>
      <div className="board-toolbar"><div><span className="eyebrow">VISÃO DA UNIDADE</span><h2>Mapa assistencial</h2></div><div className="backup-actions"><button className="secondary-btn" onClick={exportBackup}>Exportar backup</button><label className="secondary-btn">Importar<input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" /></label></div></div>
      <details className="editor-card"><summary>Internações arquivadas</summary>{Object.values(state.archivedEpisodes||{}).map(p=><div key={p.episodeId} className="editor-actions"><span>{p.patientName}</span><button className="secondary-btn" onClick={()=>{actions.viewEpisode(p.patientId);onOpenPatient();}}>Consultar histórico</button><select aria-label={`Restaurar internação ${p.patientName}`} defaultValue="" onChange={e=>{if(e.target.value)actions.restoreEpisode(p.patientId,e.target.value);}}><option value="">Restaurar em leito livre</option>{bedIds.filter(id=>state.beds[id].status==='empty').map(id=><option key={id} value={id}>{id}</option>)}</select></div>)}</details>
      {importMsg && <p role="status" className="inline-notice">{importMsg}</p>}
      <div className="board-controls"><label className="search-input"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input aria-label="Buscar paciente ou leito" placeholder="Buscar paciente ou leito" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filter-tabs" aria-label="Filtrar leitos">{[['all','Todos'],['occupied','Ocupados'],['critical','Críticos'],['isolation','Isolamento'],['empty','Vagos']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div></div>
      <ul className="bed-grid">
        {visibleBeds.map(id=>{const bed=state.beds[id],ui=STATUS_UI[bed.status],ref=referenceDay(bed),handoff=deriveHandoff(bed),pending=handoff.checklist.filter(c=>c.status==='pendente').length;
          return <li key={id} className={`bed-card ${bed.status}`}>
           <button className="bed-open" aria-label={bed.status==='empty'?`Admitir paciente no leito ${id}`:`Abrir painel do leito ${id}`} onClick={()=>{if(bed.status==='empty')setEditBed(id);else{actions.setActiveBed(id);onOpenPatient();}}}>
            <div className="bed-card-top"><span className="bed-number">{id}</span><span className="flex flex-wrap justify-end gap-1"><span className={`status-badge ${bed.status}`}>{ui.label}</span>{bed.isIsolation && bed.status!=='isolation' && <span className="status-badge isolation">Isolamento</span>}</span></div>
            <h3>{bed.patientName || 'Leito disponível'}</h3>
            {bed.status==='empty'?<p className="muted">Pronto para nova admissão</p>:<><p className="bed-details">{[bed.age&&`${bed.age} anos`,bed.diUti&&`DI-UTI ${bed.diUti}`].filter(Boolean).join(' · ') || 'Paciente admitido'}</p><p className="bed-diagnosis">{handoff.diagnosticos[0] || 'Diagnóstico ainda não registrado'}</p><div className="bed-data"><span>{filledCount(bed,ref)} campos · D{ref+1}</span><span>{pending} pendências</span></div></>}
           </button>
           <div className="bed-card-footer">{bed.status==='empty'?<button onClick={()=>setEditBed(id)}>Admitir paciente</button>:<><button onClick={()=>{actions.setActiveBed(id);onOpenFicha();}}>Ficha diária</button><button aria-label={`Ações do leito ${id}`} onClick={()=>setMenuBed(id)}>Ações</button></>}</div>
          </li>;
        })}
      </ul>
      {!visibleBeds.length && <div className="empty-state"><h3>Nenhum leito encontrado</h3><p>Ajuste a busca ou o filtro.</p><button className="secondary-btn" onClick={()=>{setQuery('');setFilter('all');}}>Limpar filtros</button></div>}
      <div className="board-footnote"><span>{visibleBeds.length} de {census.total} leitos</span><span>Dados compartilhados · salvamento no servidor</span></div>
      <ConfirmSheet open={!!importPending} onClose={()=>setImportPending(null)} title="Restaurar backup?" message="O arquivo será validado antes de incorporar registros. Não substitui dados existentes." confirmLabel="Restaurar" onConfirm={()=>{actions.importState(importPending);setImportMsg('Importação enviada para salvamento. Confira o estado de salvamento.');}} />

      <ActionSheet
        open={!!b}
        onClose={() => setMenuBed(null)}
        title={b ? `Leito ${b.bedId} · ${b.patientName}` : ''}
        subtitle={b ? [b.age && `${b.age} anos`, b.diUti && `DI-UTI ${b.diUti}`].filter(Boolean).join(' · ') : ''}
        actions={b ? [
          { id: 'ficha', label: 'Abrir ficha diária', tone: 'primary', onSelect: () => { actions.setActiveBed(b.bedId); onOpenFicha(); } },
          { id: 'edit', label: 'Editar identificação', onSelect: () => setEditBed(b.bedId) },
          { id: 'crit', label: b.status === 'critical' ? 'Remover marcação crítica' : 'Marcar como crítico', onSelect: () => actions.setStatus(b.bedId, b.status === 'critical' ? 'occupied' : 'critical') },
          { id: 'iso', label: (b.isIsolation || b.status === 'isolation') ? 'Encerrar isolamento' : 'Marcar isolamento', onSelect: () => actions.updateBed(b.bedId, {isIsolation: !(b.isIsolation || b.status === 'isolation'), status: b.status === 'isolation' ? 'occupied' : b.status}) },
          { id: 'alta', label: 'Alta / liberar leito', hint: 'Arquiva a internação e preserva o histórico', tone: 'destructive', onSelect: () => setConfirm(b.bedId) },
        ] : []}
      />

      <IdentificationSheet bedId={editBed} onClose={() => setEditBed(null)} />

      <ConfirmSheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Liberar leito ${confirm}?`}
        message="A internação será arquivada; fichas, evoluções e prescrições permanecerão no histórico."
        confirmLabel="Liberar leito"
        onConfirm={() => actions.dischargeBed(confirm)}
      />
    </>
  );
}

function IdentificationSheet({ bedId, onClose }) {
  const { state, actions } = useICU();
  const bed = bedId ? state.beds[bedId] : null;
  const [form, setForm] = useState(null);
  const [lastId, setLastId] = useState(null);
  if (bedId !== lastId) { setLastId(bedId); setForm(bed ? { patientName: bed.patientName, age: bed.age, hospitalAdmissionDate: bed.hospitalAdmissionDate, admissionDate: bed.admissionDate, weight: { ...bed.weight } } : null); }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const field = 'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#15618a] focus:outline-none focus:ring-2 focus:ring-[#15618a]/25';

  return (
    <BottomSheet
      open={!!bedId}
      onClose={onClose}
      title={bed?.status === 'empty' ? `Admitir no leito ${bedId}` : `Identificação · Leito ${bedId}`}
      footer={
        <button
          type="button"
          disabled={!form?.patientName?.trim()}
          onClick={() => { actions.updateBed(bedId, form); actions.setActiveBed(bedId); onClose(); }}
          className="min-h-12 w-full rounded-xl bg-[#123b60] text-base font-bold text-white disabled:opacity-40"
        >
          Salvar
        </button>
      }
    >
      {form && (
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">Paciente
            <input className={field} value={form.patientName} onChange={(e) => set('patientName', e.target.value)} autoComplete="off" autoCapitalize="characters" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">Idade (anos)
              <input className={field} inputMode="numeric" pattern="[0-9]*" value={form.age} onChange={(e) => set('age', e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="text-sm font-semibold text-slate-700">Peso (kg)
              <input className={field} inputMode="decimal" value={form.weight.value} onChange={(e) => set('weight', { ...form.weight, value: e.target.value })} />
            </label>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 text-base text-slate-800">
            Peso estimado
            <input type="checkbox" className="h-6 w-6 accent-[#123b60]" checked={form.weight.isEstimated} onChange={(e) => set('weight', { ...form.weight, isEstimated: e.target.checked })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">Internação hospitalar
              <input type="date" className={field} value={form.hospitalAdmissionDate} onChange={(e) => set('hospitalAdmissionDate', e.target.value)} />
            </label>
            <label className="text-sm font-semibold text-slate-700">Admissão UTI
              <input type="date" className={field} value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} />
            </label>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
