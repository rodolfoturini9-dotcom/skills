import React from 'react';
import { useICU } from '../context/ICUContext.jsx';
import { isoToBR, todayISO } from '../core/icuStore.js';
const NAV = [['leitos','Mapa de leitos','grid'],['paciente','Painel do paciente','person'],['ficha','Ficha diária','sheet'],['evolucao','Evolução médica','doc'],['prescricao','Prescrição','doc'],['passagem','Passagem de plantão','swap'],['ia','IA · Claude','doc']];
export function Icon({ name, className = '' }) {
 const paths = {grid:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,person:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,sheet:<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12M4 15h16"/></>,doc:<><path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h8"/></>,swap:<><path d="M4 7h16l-4-4M20 17H4l4 4"/></>};
 return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name] || paths.doc}</svg>;
}
export default function Layout({route,onNavigate,title,children}) {
 const {activeBed:bed,census,saveStatus}=useICU();
 const save={saving:'Salvando…',saved:'Salvo no servidor',error:'Falha ao salvar — exporte o rascunho',idle:'Carregando registros',loading:'Carregando registros'}[saveStatus];
 return <div className="app-shell">
  <aside className="app-sidebar no-print">
   <div className="brand"><span className="brand-mark">H<span>+</span></span><div><strong>HRIV</strong><small>Medicina intensiva</small></div></div>
   <div className="sidebar-section">PRONTUÁRIO · UTI ADULTO</div>
   <nav aria-label="Principal">{NAV.map(([id,label,icon])=><button key={id} aria-current={route===id?'page':undefined} onClick={()=>onNavigate(id)}><Icon name={icon}/>{label}</button>)}</nav>
   <div className="sidebar-census"><span>Ocupação da unidade</span><strong>{census.occupied}<small> / {census.total}</small></strong><div className="occupancy-track"><i style={{width:`${census.occupied*10}%`}}/></div></div>
   <div className="sidebar-bottom"><span>LEITO ATIVO</span><b>{bed.bedId} · {bed.patientName || 'Vago'}</b><small>Hospital Regional de Ivaiporã</small><a href="/legado">Ferramentas anteriores</a><a href="/auth/logout">Encerrar sessão</a></div>
  </aside>
  <div className="app-workspace"><header className="app-header no-print"><div><div className="header-context">UTI Adulto <span>/</span> Prontuário eletrônico</div><h1>{title}</h1></div><div className="header-meta"><time>{isoToBR(todayISO())}</time><span role="status" className={saveStatus==='error'?'save-error':''}>{save}</span><a className="header-logout" href="/auth/logout">Sair</a></div></header>
   {route!=='leitos' && bed.status!=='empty' && <div className="active-patient-strip no-print"><span className="bed-mini">{bed.bedId}</span><b>{bed.patientName}</b><span>{[bed.age && `${bed.age} anos`,bed.diUti && `DI-UTI ${bed.diUti}`].filter(Boolean).join(' · ')}</span><button onClick={()=>onNavigate('leitos')}>Trocar paciente</button></div>}
   <main className="app-main">{children}</main>
  </div>
  <nav className="mobile-nav no-print" aria-label="Navegação móvel">{NAV.filter(([id])=>id!=='paciente'&&id!=='ia').map(([id,label,icon])=><button key={id} aria-current={route===id?'page':undefined} onClick={()=>onNavigate(id)}><Icon name={icon}/><span>{label.replace('Mapa de ','').replace(' diária','').replace(' médica','').replace(' de plantão','')}</span></button>)}</nav>
 </div>;
}
