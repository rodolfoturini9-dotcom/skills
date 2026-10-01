import React, { useCallback, useEffect, useState } from 'react';
import { aiFetch } from '../services/aiJobs.js';

const OPS = { 'pep.handoff': 'Passagem de plantão', 'pep.organize_chart': 'Organização do prontuário', 'pep.evolution': 'Evolução', 'pep.extract': 'Extração de ficha', 'ficha.interpret': 'Interpretação de ficha (legado)', 'evolution.generate': 'Evolução (legado)', 'icu.analyze': 'Análise de texto (legado)', assistant: 'Assistente clínico', ping: 'Teste de conexão' };
const n = v => new Intl.NumberFormat('pt-BR').format(v || 0);

// Painel de administração da IA: status da configuração, teste de conexão e consumo.
export default function AIPanel() {
  const [status, setStatus] = useState(null);
  const [usage, setUsage] = useState(null);
  const [test, setTest] = useState({ busy: false, text: '' });
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([fetch('/api/ai/status', { cache: 'no-store' }), fetch('/api/ai/usage', { cache: 'no-store' })]);
      if (!s.ok || !u.ok) throw Error('Não foi possível carregar o status da IA.');
      setStatus(await s.json()); setUsage(await u.json()); setError('');
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const runTest = async () => {
    setTest({ busy: true, text: 'Testando conexão com a API Anthropic…' });
    try {
      const r = await aiFetch('/api/ai/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, { onStatus: s => setTest({ busy: true, text: `Testando… ${s.seconds} s` }) });
      const d = await r.json();
      setTest({ busy: false, text: r.ok ? `Conexão confirmada · modelo ${d.model} · resposta "${d.reply}"` : `Falha: ${d.error}` });
    } catch (e) { setTest({ busy: false, text: `Falha: ${e.message}` }); }
    load();
  };
  return (
    <div className="ai-panel grid gap-4">
      {error && <p role="alert" className="inline-notice">{error}</p>}
      <section className="editor-card">
        <div className="section-heading"><h2>Integração de IA · Anthropic (Claude)</h2>
          <span className={`status-badge ${status?.configured ? 'occupied' : 'critical'}`}>{status ? (status.configured ? 'Configurada' : 'Não configurada') : 'Carregando'}</span></div>
        {status && <dl className="ai-facts">
          <div><dt>Modelo</dt><dd>{status.model}</dd></div>
          <div><dt>Conexão</dt><dd>{status.route}</dd></div>
          <div><dt>Execução</dt><dd>{status.async ? 'Em background (até 15 min por geração)' : 'Direta (ambiente local)'}</dd></div>
          <div><dt>Fallback em recusa</dt><dd>{status.fallbacks ? 'Ativo (servidor Anthropic)' : 'Indisponível nesta conexão'}</dd></div>
        </dl>}
        <div className="editor-actions"><button type="button" className="primary-btn" disabled={test.busy || !status?.configured} onClick={runTest}>Testar conexão</button><button type="button" className="secondary-btn" onClick={load}>Atualizar</button>{test.text && <span role="status">{test.text}</span>}</div>
        {status && !status.configured && <div className="inline-notice">
          <b>Como ativar:</b> crie uma chave em console.anthropic.com → Settings → API Keys; no Netlify, abra o site → Project configuration → Environment variables e cadastre <code>ANTHROPIC_API_KEY</code> (escopo Functions, marcada como secreta). Publique novamente o site para a função carregar a chave.
        </div>}
      </section>
      <section className="editor-card">
        <div className="section-heading"><h2>Consumo · últimos {usage?.days || 30} dias</h2></div>
        {usage && <>
          <div className="census-grid">
            {[['Gerações', n(usage.requests)], ['Concluídas', n(usage.succeeded)], ['Falhas', n(usage.failed)], ['Custo estimado', `US$ ${usage.estimatedCostUSD.toFixed(2)}`]].map(([l, v]) => <section key={l} className="census-card"><span>{l}</span><strong>{v}</strong></section>)}
          </div>
          <p className="muted">Tokens de entrada: {n(usage.inputTokens)} · saída: {n(usage.outputTokens)}. Estimativa pela tabela pública de preços; a cobrança oficial está no console da Anthropic.</p>
          <table className="ai-table"><thead><tr><th>Quando</th><th>Função</th><th>Situação</th><th>Duração</th><th>Modelo</th></tr></thead>
            <tbody>{usage.recent.map((r, i) => <tr key={i}><td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td><td>{OPS[r.operation] || r.operation}</td><td>{{ done: 'Concluída', error: 'Falha', running: 'Em execução', queued: 'Na fila' }[r.status] || r.status}</td><td>{r.seconds != null ? `${r.seconds} s` : '—'}</td><td>{r.model || '—'}</td></tr>)}
              {!usage.recent.length && <tr><td colSpan={5} className="muted">Nenhuma geração registrada.</td></tr>}</tbody></table>
        </>}
      </section>
      <section className="editor-card">
        <div className="section-heading"><h2>Funções de IA disponíveis</h2></div>
        <ul className="ai-list">
          <li><b>Passagem de plantão:</b> organiza HD, HMP, HMA, CD/metas e pendências dos leitos selecionados para revisão.</li>
          <li><b>Organização do prontuário:</b> monta resumo da internação e registros por data a partir da documentação.</li>
          <li><b>Evolução:</b> gera a evolução da data selecionada a partir da ficha e das notas.</li>
          <li><b>Extração de ficha:</b> transcreve valores de texto ou foto da ficha para as células.</li>
          <li><b>Assistente clínico:</b> perguntas sobre o paciente no painel do paciente, com consulta somente leitura aos registros.</li>
        </ul>
        <p className="muted">Toda saída de IA passa por revisão antes de ser aplicada ao prontuário. Os conteúdos enviados à Anthropic seguem a política de dados da conta (sem retenção para treinamento na API comercial).</p>
      </section>
    </div>
  );
}
