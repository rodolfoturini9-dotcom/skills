// Auto-escala para 1 página A4: mede o conteúdo em escala 1 e aplica transform: scale() apenas redutor.
export const mmToPx = (mm) => (mm * 96) / 25.4;

export function ajustarParaUmaPaginaA4(content, { widthMm = 199.5, heightMm = 286.5, min = 0.35, safety = 0.985 } = {}) {
  if (!content) return 1;
  content.style.transform = 'none';
  content.style.width = `${widthMm}mm`;
  const w = content.scrollWidth, h = content.scrollHeight;
  let s = Math.min(1, mmToPx(widthMm) / Math.max(w, 1), mmToPx(heightMm) / Math.max(h, 1));
  s = Math.max(min, s * safety);
  content.style.transformOrigin = 'top left';
  content.style.transform = `scale(${s})`;
  content.dataset.printScale = s.toFixed(4);
  return s;
}

export function restaurarEscalaTela(content) {
  if (!content) return;
  content.style.transform = 'none';
}
