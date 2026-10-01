// Chamadas de IA (Claude) assíncronas: o servidor responde 202 com o id do job e a geração roda em
// background. Este helper acompanha o job e devolve uma Response equivalente à chamada síncrona.
const POLL_MS = 1500, MAX_MS = 15 * 60 * 1000;
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelado', 'AbortError')); }, { once: true });
});

export async function aiFetch(url, init = {}, { onStatus } = {}) {
  const first = await fetch(url, init);
  if (first.status !== 202) return first;
  const { jobId } = await first.json();
  const started = Date.now();
  onStatus?.({ status: 'queued', seconds: 0 });
  while (Date.now() - started < MAX_MS) {
    await wait(POLL_MS, init.signal);
    const r = await fetch('/api/ai/job?id=' + encodeURIComponent(jobId), { cache: 'no-store', signal: init.signal });
    if (r.status === 401) return r;
    const job = await r.json().catch(() => null);
    if (!r.ok || !job) return new Response(JSON.stringify({ error: job?.error || 'Falha ao acompanhar a geração por IA.' }), { status: r.status || 502, headers: { 'Content-Type': 'application/json' } });
    onStatus?.({ status: job.status, seconds: Math.round((Date.now() - started) / 1000) });
    if (job.status === 'done' || job.status === 'error') {
      return new Response(job.result || JSON.stringify({ error: 'Resposta vazia da IA.' }), { status: job.httpStatus || (job.status === 'done' ? 200 : 502), headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response(JSON.stringify({ error: 'A geração por IA excedeu o tempo de acompanhamento. Consulte novamente em instantes.' }), { status: 504, headers: { 'Content-Type': 'application/json' } });
}
