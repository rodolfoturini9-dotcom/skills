// Impressão isolada por documento: injeta a regra @page do documento ativo e marca <html data-print="id">.
// Cada módulo tem sua própria geometria (ficha A4 retrato, evolução A4 retrato, passagem A4 paisagem).
export const PAGE_RULES = {
  ficha: '@page { size: A4 portrait; margin: 6mm; }',
  prescricao: '@page { size: A4 portrait; margin: 12mm; }',
  evolucao: '@page { size: A4 portrait; margin: 5mm; }',
  passagem: '@page { size: A4 landscape; margin: 3mm; }',
};

export function printDocument(id, { before, after } = {}) {
  const style = document.createElement('style');
  style.id = 'pep-page-rule';
  style.textContent = PAGE_RULES[id] || '';
  document.getElementById('pep-page-rule')?.remove();
  document.head.appendChild(style);
  document.documentElement.dataset.print = id;
  try { before?.(); } catch(e) { delete document.documentElement.dataset.print;style.remove();throw e; }
  const cleanup = () => {
    after?.();
    delete document.documentElement.dataset.print;
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  // Dá um frame ao layout antes do diálogo (iOS Safari mede a página no disparo).
  requestAnimationFrame(() => setTimeout(() => window.print(), 30));
}
