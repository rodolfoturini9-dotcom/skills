# UTI Adulto — Gestão de Plantão (HRIV)

Prontuário de plantão para UTI adulto: mapa de 10 leitos, ficha diária, evolução, passagem de plantão, prescrição com diluições, impressão A4, importação/exportação de backup, auditoria e integrações opcionais de IA (OpenAI).

## Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19 + Vite (SPA em `app/pep`; ferramentas anteriores em `/legado`) |
| Servidor | Uma Netlify Function (`netlify/functions/uti.ts`) que executa o roteador em `worker/` |
| Banco em nuvem | Netlify Database (PostgreSQL gerenciado), provisionado automaticamente |
| Migrações | `netlify/database/migrations/*/migration.sql`, aplicadas pelo Netlify a cada deploy |
| Acesso | Senha única + cookie de sessão HttpOnly/Secure/SameSite=Strict, expiração por inatividade (15 min) e limite de 10 tentativas/15 min por IP |

Os arquivos JS/CSS de `dist/assets` são públicos (somente código). As páginas HTML e todas as rotas `/api/*` passam pela função e exigem sessão válida.

## Variáveis de ambiente (Netlify → Project configuration → Environment variables)

| Variável | Obrigatória | Conteúdo |
| --- | --- | --- |
| `ACCESS_PASSWORD` | Sim | Senha de acesso ao sistema |
| `ACCESS_SESSION_SECRET` | Sim | Segredo aleatório (≥ 32 bytes) para derivar identificadores de sessão |
| `OPENAI_API_KEY` | Não | Habilita as funções de IA integradas; sem ela, use os prompts para IA externa |

O banco não exige variável manual: o Netlify Database injeta a conexão na função.

## Desenvolvimento e verificação

```bash
npm ci
npm run build        # Vite + embute as páginas HTML na função
npm test             # 75 testes (Postgres real via PGlite) + verificações de domínio
npm run typecheck
node scripts/verify-ui.mjs   # E2E de interface (Playwright/Chromium), desktop e celular
NETLIFY_DB_URL=postgres://... node scripts/smoke-function.mjs   # função empacotada contra Postgres real
```

## Publicação

O deploy de produção roda `npm run build`, aplica as migrações no banco de produção e publica `dist` + a função. Deploy previews recebem uma ramificação isolada do banco.

## Migração de dados de outra instalação

Exporte o backup no sistema anterior (`Exportar backup`) e importe no novo (`Importar`). A importação valida e incorpora registros sem sobrescrever pacientes existentes. As migrações SQLite originais estão em `original-sites/drizzle-sqlite/` apenas como referência.

Relatório da análise e correções: `docs/ANALISE-E-CORRECOES.md`.
