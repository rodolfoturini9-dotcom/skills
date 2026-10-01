'use client';
import {useEffect,useRef,type ReactNode} from 'react';

export default function BottomSheet({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const panel=useRef<HTMLDivElement>(null),start=useRef<number|null>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key!=='Tab'||!panel.current)return;const nodes=Array.from(panel.current.querySelectorAll<HTMLElement>('button,input,textarea,select,[tabindex]:not([tabindex="-1"])')).filter(n=>!n.hasAttribute('disabled'));if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};document.addEventListener('keydown',escape);document.body.style.overflow='hidden';panel.current?.focus();return()=>{document.removeEventListener('keydown',escape);document.body.style.overflow='';previous?.focus();};},[open,onClose]);
 if(!open)return null;
 return <div className="icu-sheet-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="icu-sheet" ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
   <div className="icu-sheet-handle" aria-hidden="true" onTouchStart={e=>start.current=e.touches[0].clientY} onTouchEnd={e=>{if(start.current!==null&&e.changedTouches[0].clientY-start.current>90)onClose();start.current=null;}} />
   <div className="icu-sheet-heading"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Fechar painel">Fechar</button></div>
   <div className="icu-sheet-body">{children}</div>
  </div>
 </div>;
}
