# UTI Adulto — relatório da revisão

Data: 16/09/2026. Estado: implementação salva para revisão; **não publicada**. A validação obrigatória dos fluxos no navegador está bloqueada pelo ambiente (`net::ERR_BLOCKED_BY_CLIENT` em `http://terminal.local:4173/`). Não considerar os critérios de aceite integralmente atendidos antes desse teste.

## Implementado

- Módulo nativo de avaliação diária em React, vinculado a paciente, leito, médico e data. Sem iframe. Dezessete sistemas, texto livre, dados estáveis, ficha original, escalas e resumo estruturado.
- Registros clínicos persistentes para avaliação, perfil longitudinal, controles, exames, infusão, antimicrobiano, dispositivos, prescrição, evolução, passagem revisada, metas e checklist.
- Autosave com estados de salvamento, erro e sucesso; rascunhos temporários por aba; recuperação; histórico imutável; retificação de documentos finalizados; finalização com médico e confirmação; bloqueio de conflitos de versões.
- Replicação confirmada de alergias, comorbidades, medicamentos habituais e diretivas. Dados diários não são copiados por essa ação. A ação separada de duplicação integral exige confirmação e produz rascunho para revisão.
- Cadastro original preservado; troca de leito, arquivamento e documentos continuam disponíveis. Alterações nas tabelas anteriores ganham trilha de auditoria. Edição de paciente verifica a versão recebida para evitar sobrescrita por outra aba.
- Dashboard com estados da avaliação, evolução e passagem; filtros de suporte documentado, TRS, isolamento, avaliação pendente, alta prevista e pendências; ordenação por leito, gravidade registrada e pendências.
- Geração de evolução a partir de dados registrados. Passagem detalhada e resumo verbal de até 180 palavras, com riscos no início; dados do cadastro são identificados como sujeitos a conferência de atualidade.
- Prescrição existente preservada (93 medicamentos); confirmação de inclusão, recuperação de rascunho e gravação de versão revisada vinculada ao paciente e prescritor. A aplicação não administra fármacos.
- Exames manuais, colagem e importação de texto simples até 1 MB, fonte/conferência e comparação tabular. Conteúdo é tratado como texto, sem execução de HTML.
- Balanço parcial/24 h com intervalos explícitos e rejeição de sobreposição; diurese em mL/kg/h; tabela seriada e gráfico de PAM. Sem preenchimento implícito de zeros.
- Sessões aleatórias com identificador criptográfico no banco, cookie HttpOnly/Secure/SameSite, prazo absoluto de 12 h, inatividade de 15 min, revogação no logout, limitação de tentativas e verificação de origem em POST. Respostas clínicas sem cache e APIs retornam 401 quando a sessão expira.
- Backup completo criptografado no navegador, AES-GCM e senha derivada por PBKDF2; restauração confirmada sem sobrescrever dados existentes. Histórico de exportação/restauração e acessos bem-sucedidos.
- Prompts da integração já existente com IA separados da interface. Sem chave configurada, a entrada manual permanece disponível. Nenhum serviço de IA foi chamado com dados clínicos durante os testes.

## Ficha HTML

Foram reconstruídas as 55 posições da tabela: acessos, ganhos, perdas, sinais vitais, antimicrobianos, DVA, sedação, neurologia, ventilação, gasometria, hematologia, metabolismo e marcadores cardíacos. O agrupamento foi obtido da tabela, corrigindo os deslocamentos do array de grupos do HTML.

Os campos originalmente sem nome das posições 6, 7 e 12 foram mantidos como campos livres. Abreviações como PIA/PIC/PVC, VG e MB foram preservadas; não receberam interpretações inventadas. É necessário confirmar a finalidade desses campos antes de renomeá-los.

O HTML tinha ações que reatribuíam uma variável `const`, cópia ampla de dados do dia anterior e cálculos com risco de confundir campo vazio com zero. Esses comportamentos não foram transportados para o módulo nativo. O arquivo legado `public/ficha-uti/index.html` permanece intacto por compatibilidade, com teste de integridade; ele não é a implementação do novo módulo.

Importação de JSON da ficha antiga: selecione paciente → Avaliação diária → Importar backup da ficha HTML anterior → confira datas/valores → confirme. Registros importados sem horário mantêm explicitamente essa ausência.

## Cálculos e limites clínicos

- Glasgow: soma dos três componentes somente quando todos são válidos. NT em qualquer componente impede total. Orientação conferida em [Glasgow Coma Scale — FAQ](https://www.glasgowcomascale.org/faq/) e [instrumento oficial](https://www.glasgowcomascale.org/downloads/GCS-Assessment-Aid-English.pdf?v=3).
- SOFA clássico: soma dos seis componentes **pontuados manualmente** (0–4), com validação. Não transforma exames em escores automaticamente e não equivale ao SOFA-2 manual já existente.
- RASS, Ramsay, Braden, Morse e Fugulin: registro manual com limites; não há classificação clínica ou cálculo automático dos subitens.
- Balanço = entradas − (diurese + drenos/ostomias + perdas digestivas + ultrafiltração + outras perdas). Todos os valores devem ser informados, incluindo zeros confirmados.
- Diurese = volume / peso / horas. Peso e duração devem ser positivos.
- Infusão: concentração = quantidade convertida / volume final; mL/h = dose × peso (quando aplicável) × 60 (por minuto) / concentração. Validação de compatibilidade entre mg, mcg e UI. Nenhum valor máximo é inventado.

## Visual e impressão

Azul-marinho, cinza e branco; navegação lateral e gaveta móvel existente; componentes de formulário compartilhados, ações fixas nos formulários extensos, alvos de toque de 44 px e tabelas com rolagem em telas estreitas. Modo claro mantido.

Avaliação: folha A4 retrato com conteúdo textual fluido. Passagem: A4 paisagem, três resumos por página, com anexos integrais quando o resumo excede 140 palavras e checklist consolidado. A estrutura HTML foi testada, mas paginação, ausência de cortes e legibilidade física ainda exigem validação no navegador/PDF.

## Arquivos principais

| Arquivo | Responsabilidade |
|---|---|
| `app/clinical/model.ts` | Tipos, campos, validações, cálculos, resumos |
| `app/clinical/Workspace.tsx` | Formulários nativos, autosave, histórico, recuperação, impressão |
| `app/clinical/LegacyImport.tsx` | Prévia e importação confirmada da ficha antiga |
| `app/clinical/Handoff.tsx` | Passagem detalhada, verbal e impressão |
| `app/clinical/Security.tsx` | Backup criptografado, restauração e auditoria |
| `app/clinical/prompts.ts` | Prompts separados da interface |
| `app/page.tsx`, `app/globals.css` | Integração aos módulos existentes e identidade visual |
| `worker/clinical-api.ts` | Persistência versionada, conflitos, backup/restauração |
| `worker/icu-api.ts`, `worker/index.ts` | APIs preservadas, validações, autenticação e proteção |
| `db/schema.ts`, `drizzle/0006_loose_namora.sql` | Novas tabelas e triggers de auditoria |
| `drizzle/meta/*` | Metadados de migração |
| `worker/runtime.d.ts` | Tipos gerados do runtime Cloudflare |
| `tests/clinical.test.mjs` | Testes funcionais com SQLite efêmero e dados sintéticos |
| `scripts/sites-env.sh`, `.gitignore` | Ambiente local e exclusão de artefatos temporários |

## Verificação

- TypeScript: `tsc --noEmit`, sem erros.
- Build: cinco etapas Vinext concluídas, artefato ESM Worker validado.
- 20 testes automatizados: 13 novos e 7 existentes. Abrangem banco/migrações, gravação, recuperação, conflito, finalização, restauração, validação, troca de leito, auditoria, fórmulas, agregação de períodos, login, expiração, logout, CSRF, limite de tentativas, estrutura de três pacientes/anexos, escape de conteúdo, integridade da ficha legada, medicamentos e renderização inicial.
- Não foram usados dados reais. Os testes criam SQLite em memória; não alteram o banco de produção.
- **Não executados com sucesso no navegador:** cadastro completo por interface, autosave digitado, recarga visual, clipboard, filtros interativos, desktop/tablet/celular, console da aplicação, impressão/PDF e três pacientes por folha física. O navegador bloqueou a prévia antes de abrir a aplicação.

## Executar e configurar

Node >= 22.13, dependências pelo lockfile (`npm ci`). Desenvolvimento: `npm run dev`. Build: `npm run build`. Testes: `npm test`. Tipagem: `npx tsc --noEmit`. No ambiente Sites gerenciado: `sites-preview start /workspace/sites/uti-gestao-plantao`.

Banco: binding D1 `DB`, migrações em `drizzle/`. A migração 0006 adiciona tabelas e auditoria sem remover dados antigos; deve ser aplicada antes do novo Worker. No Sites, o pacote inclui as migrações. Preserve backup antes de uma publicação futura. A versão anterior do código está no Git; reverter código não deve apagar as novas tabelas.

Segredos obrigatórios do servidor: `ACCESS_PASSWORD`, `ACCESS_SESSION_SECRET`. Reutilizar/configurar valores reais pelo ambiente de hospedagem; nenhum valor foi colocado no código. `OPENAI_API_KEY` é opcional para extração por IA. Não há nova integração Supabase no módulo nativo. A senha de backup é escolhida pelo usuário e não é armazenada pelo sistema.

O modo de validação local preexistente em `localhost` não requer autenticação quando os segredos estão ausentes; não use esse modo para dados reais. Outros hosts sem configuração recusam acesso. O acesso da hospedagem existente não foi alterado.

## Backup e restauração

1. Abra Segurança / backup; escolha senha de no mínimo 12 caracteres e baixe o arquivo criptografado.
2. Guarde arquivo e senha separadamente. Perda da senha impede recuperar esse arquivo.
3. Para restaurar, informe a senha, selecione o JSON, confira contagens e confirme.
4. A restauração adiciona registros ausentes; IDs/versões já existentes são preservados. Recarregue a aplicação depois.
5. A interface limita a restauração a 800 registros para manter o lote atômico. Backups maiores exigem procedimento administrativo, ainda não automatizado na interface.

## Limitações e prioridades restantes

**P0 — antes de usar esta revisão em produção:** desbloquear o navegador de prévia e executar todos os fluxos obrigatórios; verificar PDFs longos e telas de 390/768/1440 px; testar recuperação de rascunhos na interface; validar a migração em cópia do banco. Revisar clinicamente fórmulas, rótulos e convenções de dias de internação/tratamento.

**P1:** testes completos da criptografia/restauração via interface; restauração administrativa para mais de 800 registros; aprimorar retenção/exclusão definitiva controlada; substituir o cadastro livre legado por suporte estruturado em todos os fluxos; ampliar rastreio de trechos de origem nas respostas de IA; tornar todos os formulários legados cobertos pelo mesmo mecanismo de autosave versionado. O autosave completo desta revisão abrange o módulo nativo; cadastro, evolução e prescrição legados possuem recuperação local parcial.

**P2:** subcomponentes detalhados de escalas adicionais, gráficos além de PAM, importação de PDF/OCR validada e modo escuro. Não há sincronização offline automática entre dispositivos nem garantia formal de conformidade LGPD derivada apenas destas alterações.

A revisão está salva no repositório. A versão publicada anterior permanece em uso; os critérios de aceite referentes ao navegador e à impressão continuam pendentes.
