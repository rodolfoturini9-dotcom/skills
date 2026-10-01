'use client';
import type {ReactNode} from 'react';
export type MainTab='leitos'|'passagem'|'apoio';
const tabs:{id:MainTab;label:string;short:string;mark:string}[]=[{id:'leitos',label:'Leitos',short:'Leitos',mark:'01'},{id:'passagem',label:'Passagem de plantão',short:'Plantão',mark:'02'},{id:'apoio',label:'Apoio e prescrição',short:'Apoio',mark:'03'}];
export default function Layout({tab,onTab,children}:{tab:MainTab;onTab:(tab:MainTab)=>void;children:ReactNode}){
 return <div className="icu-app">
  <aside className="icu-sidebar"><div className="icu-brand"><span>HOSPITAL REGIONAL DE IVAIPORÃ</span><strong>UTI Adulto</strong><small>Gestão de plantão</small></div><nav aria-label="Navegação principal">{tabs.map(item=><button type="button" key={item.id} className={tab===item.id?'active':''} aria-current={tab===item.id?'page':undefined} onClick={()=>onTab(item.id)}><span aria-hidden="true">{item.mark}</span>{item.label}</button>)}</nav><form action="/auth/logout" method="post"><button type="submit">Sair do sistema</button></form></aside>
  <div className="icu-workspace"><header className="icu-header"><div><span>HOSPITAL REGIONAL DE IVAIPORÃ</span><strong>UTI Adulto</strong></div><form action="/auth/logout" method="post"><button type="submit">Sair</button></form></header>
  <main id="conteudo" className="icu-main">{children}</main></div>
  <nav className="icu-bottom-nav" aria-label="Navegação principal">{tabs.map(item=><button type="button" key={item.id} className={tab===item.id?'active':''} aria-current={tab===item.id?'page':undefined} onClick={()=>onTab(item.id)}><span aria-hidden="true">{item.mark}</span>{item.short}</button>)}</nav>
 </div>;
}
