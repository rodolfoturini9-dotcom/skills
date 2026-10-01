# Análise holística, correções e melhorias — 01/10/2026

## Estado recebido

- Sistema React/Vite com backend escrito para Cloudflare Workers + D1 (SQLite), adaptado parcialmente para Netlify + Turso. Sem credenciais Turso, o deploy não funcionaria.
- Resíduos de três plataformas (Next.js, vinext/ChatGPT Sites, Cloudflare) coexistiam: páginas Next não usadas, `db/index.ts` dependente de `cloudflare:workers`, scripts de build com caminhos de outro ambiente, 500 KB de tipos Cloudflare.
- 4 de 13 arquivos de teste falhavam por dependerem de artefatos inexistentes (`dist/server/index.js`, `miniflare`).

## Erros corrigidos

| Problema | Impacto | Correção |
| --- | --- | --- |
| Upsert de `access_attempts` com coluna ambígua (`reset_at`) em Postgres | Limite de tentativas de login inoperante (erro 503 a cada senha errada) | Colunas qualificadas; teste de 10 tentativas → 429 |
| Ordem de leitura das tabelas legadas não determinística em Postgres | Impressão digital (`sourceToken`) instável → conflitos 409 falsos | Ordenação por chave em `legacySource` e normalização da projeção gravada |
| Restauração de backup com IDs explícitos | Colisão com IDs gerados pelos gatilhos de auditoria (perda silenciosa de auditoria) e sequências desatualizadas | Auditoria restaurada sem ID original; `setval` das sequências após restauração |
| Função lia `dist/*.html` do disco em tempo de execução | Dependente do layout de arquivos da função (frágil) | HTML embutido no build (`scripts/embed-pages.mjs`) |
| Chamadas de IA com timeout de 60–90 s | Acima do limite de execução da função síncrona; erro genérico da plataforma | Timeout de 55 s com mensagem própria |
| Rótulo de status inicial indefinido (`loading`) | Cabeçalho sem indicação durante a carga | Rótulo “Carregando registros” |
| Sem botão de saída no celular | Sessão não encerrável no layout móvel | Link “Sair” no cabeçalho |

## Banco de dados em nuvem

- Netlify Database (PostgreSQL) com esquema equivalente às 11 migrações SQLite, auditoria por gatilho genérico (`to_jsonb`) e índices preservados.
- Camada `server/database.mjs` mantém a API usada pelo código (prepare/bind/all/first/run/batch) e converte placeholders, apelidos camelCase, `last_row_id` (RETURNING) e inteiros de 64 bits.
- Todas as escritas em lote e o salvamento do prontuário ocorrem em transação serializada (trava consultiva). O salvamento relê as tabelas legadas dentro da transação e aborta se houver alteração concorrente — substitui a guarda SQL específica do SQLite (`json_each`) sem enfraquecer a verificação.

## Melhorias

- Sincronização entre dispositivos: a cada 45 s (e ao voltar para a aba), verifica nova versão (`/api/pep?op=meta`) e recarrega automaticamente quando não há alterações locais pendentes; com pendências, apenas avisa.
- Sessão expirada: aviso específico com “Entrar em nova aba”, preservando o rascunho da aba atual para reenvio.
- Tipagem do contrato de dados (`worker/db.ts`) e `npm run typecheck` sem erros.
- Testes migrados para Postgres real (PGlite) e E2E de interface (desktop 1440 px e celular 390 px) executável localmente.

## Validação executada

- 75/75 testes automatizados + 4 verificações de domínio (admissão, ficha/histórico, passagem, prescrição).
- E2E Playwright: 10 leitos, organização do prontuário, repetição após resposta perdida, recarga, passagem; sem rolagem horizontal em 390 px.
- Impressão: passagem (3 cenários) e ficha A4 sem estouro de caixas; conteúdo longo vai para páginas adicionais com aviso.
- Função empacotada (esbuild, como no Netlify) contra PostgreSQL 16 real: login, página, salvamento, ficha, API legada, backup e logout.

## Limitações

- Integração real com OpenAI não testada (exige chave).
- Gerações de IA longas podem exceder 55 s; nesse caso, gere por paciente ou use o prompt externo.
- Autenticação por senha única compartilhada: não há identificação individual do autor nos registros (“Usuário autenticado”).
