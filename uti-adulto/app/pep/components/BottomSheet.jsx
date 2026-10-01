import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Trava de rolagem compatível com iOS Safari (overflow:hidden no body não basta).
let lockCount = 0;
let savedY = 0;
function lockScroll() {
  if (lockCount++ > 0) return;
  savedY = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%' });
}
function unlockScroll() {
  if (--lockCount > 0) return;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
  window.scrollTo(0, savedY);
}

/**
 * Bottom Sheet (mobile) / diálogo centralizado (lg:).
 * - Arraste para baixo na alça ou no cabeçalho fecha (limiar 120px ou flick rápido).
 * - Backdrop, Esc e botão "Fechar" fecham.
 * - Respeita a barra de gestos (safe-area-inset-bottom).
 */
export function BottomSheet({ open, onClose, title, subtitle, children, footer, maxHeight = '88dvh' }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const drag = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      lockScroll();
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => { cancelAnimationFrame(r); unlockScroll(); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 280);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const onKey = (e) => {
      if(e.key === 'Escape') onClose?.();
      if(e.key === 'Tab') {
        const nodes=[...panelRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')];
        const first=nodes[0], last=nodes[nodes.length-1];
        if(e.shiftKey && (document.activeElement===first || document.activeElement===panelRef.current)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus({ preventScroll: true });
    return () => { window.removeEventListener('keydown', onKey); previousFocus?.focus?.({preventScroll:true}); };
  }, [open]);

  const onPointerDown = useCallback((e) => {
    drag.current = { y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);
  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    setDragY(Math.max(0, e.clientY - drag.current.y));
  }, []);
  const onPointerUp = useCallback((e) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    const v = dy / Math.max(1, performance.now() - drag.current.t);
    drag.current = null;
    setDragY(0);
    if (dy > 120 || v > 0.6) onClose?.();
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center print:hidden" role="presentation">
      <div
        className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxHeight, transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)', transition: drag.current ? 'none' : undefined }}
        className="relative flex w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
                   lg:w-[560px] lg:rounded-2xl lg:!transform-none"
      >
        <header
          className="shrink-0 touch-none select-none px-5 pt-2 pb-3 lg:pt-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 lg:hidden" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-[17px] font-bold leading-tight text-[#123b60]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 grid min-h-11 min-w-11 place-items-center rounded-full text-[15px] font-semibold text-[#15618a] active:bg-slate-100"
            >
              Fechar
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:pb-4">
            {footer}
          </footer>
        )}
        {!footer && <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" />}
      </section>
    </div>,
    document.body
  );
}

/**
 * Painel de ações estilo iOS.
 * actions: [{ id, label, hint?, tone?: 'default'|'primary'|'destructive', disabled?, onSelect }]
 */
export function ActionSheet({ open, onClose, title, subtitle, actions = [] }) {
  const tone = {
    default: 'text-slate-900',
    primary: 'text-[#123b60] font-bold',
    destructive: 'text-[#b3261e] font-semibold',
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {actions.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              disabled={a.disabled}
              onClick={() => { a.onSelect?.(); if (!a.keepOpen) onClose?.(); }}
              className={`flex min-h-12 w-full flex-col items-start justify-center px-4 py-2.5 text-left text-base active:bg-slate-100 disabled:opacity-40 ${tone[a.tone || 'default']}`}
            >
              <span>{a.label}</span>
              {a.hint && <span className="text-[13px] font-normal text-slate-500">{a.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

// Confirmação destrutiva (substitui window.confirm, que no PWA iOS pode ser suprimido).
export function ConfirmSheet({ open, onClose, title, message, confirmLabel = 'Confirmar', onConfirm, destructive = true }) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-slate-300 text-base font-semibold text-slate-700 active:bg-slate-100">Cancelar</button>
          <button
            type="button"
            onClick={() => { onConfirm?.(); onClose?.(); }}
            className={`min-h-12 rounded-xl text-base font-bold text-white ${destructive ? 'bg-[#b3261e] active:bg-[#8f1e18]' : 'bg-[#123b60] active:bg-[#0d2c48]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-base leading-relaxed text-slate-700">{message}</p>
    </BottomSheet>
  );
}
