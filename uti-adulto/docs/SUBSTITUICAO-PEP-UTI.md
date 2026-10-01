# Substituição PEP UTI — estado de validação

Projeto: appgprj_6a768579d258819193cc791e89f7e89b.
Endereço preservado: https://uti-gestao-plantao.rodolfoturini.chatgpt.site/.
Versão de produção inspecionada: 28; commit ccfae13504a9258d4f278e6aa55b4c2cc6b61d16.
A configuração de produção e o banco não foram alterados nesta preparação.

## Infraestrutura

React 19 / Vinext / Vite, Worker Cloudflare, Drizzle e D1 com binding DB. Treze tabelas existentes: patients, tasks, events, evolutions, daily_goals, medical_documents, prescribers, custom_medications, clinical_records, daily_sheets, clinical_audit, access_sessions e access_attempts.

O endereço tem audiência pública na camada Sites, mas o Worker exige a senha existente antes de liberar HTML e APIs. A proteção inclui cookie HttpOnly/Secure/SameSite, limite de tentativas, expiração por inatividade e controle de origem. Essa arquitetura foi preservada. Não existe autenticação individual por profissional na versão inspecionada; a autoria existente é “Usuário autenticado”, e não foi atribuída identidade fictícia aos registros. Não há Supabase nem outro banco identificado no código/configuração deste projeto. Não foi criado vínculo externo.

OPENAI_API_KEY, ACCESS_PASSWORD e ACCESS_SESSION_SECRET estão cadastrados como segredos. Seus valores não foram copiados. Os serviços existentes utilizam OpenAI Responses e gpt-5-mini; permanecem disponíveis. O exemplo Anthropic foi substituído pelo adaptador desses mesmos serviços, sem incluir SDK ou credencial de exemplo no frontend. O novo agente faz extração de texto/imagem, evolução e passagem estruturadas, sempre com revisão; não prescreve nem decide condutas autonomamente.

## Mapeamento de dados

| Origem | Destino no novo frontend | Preservação |
| --- | --- | --- |
| patients.id | patientId e episodeId da internação existente | Mesmo ID; nome/leito não são chave de associação |
| patients.bed | bedId no mapa | Transferência mantém ID; alta arquiva a internação |
| admission_at / icu_admission_at | hospitalAdmissionDate / admissionDate | Datas originais mantidas no registro legado; horário de criação não vira data assistencial |
| daily_sheets.data | dates/cells + dailyRecords por data explícita | Todas as datas, folhas de seis colunas, colunas antigas sem data preservadas separadamente |
| evolutions | evolution / evolutionRevisions por evolution_date | Texto e data preservados; edição de dia antigo não substitui referência mais recente |
| tasks | checklist com legacyId | Estado realizado/pendente preservado; geração não conclui tarefas |
| daily_goals | legacyGoals | Registros integrais e consulta no módulo anterior |
| clinical_records | legacyRecords | Todas as revisões, rascunhos, fontes e autoria preservadas |
| medical_documents / events | legacyDocuments / legacyEvents | Conteúdo integral permanece no banco e na internação |
| custom_medications | legacyCatalog | Catálogo anterior separado; exige conferência antes de uso; correções do ZIP não são revertidas |
| prescribers / clinical_audit | estruturas existentes | Permanecem inalteradas |

Nova estrutura: pep_revisions, com snapshot versionado, baseline dos registros legados, operation_id único, autoria e horário. Migração 0010_swift_electro.sql cria somente essa tabela e índice. Não contém DROP, TRUNCATE, exclusão, seed ou dados de pacientes. A aplicação e o registro da migração cabem ao mecanismo existente de publicação.

O primeiro GET projeta os dados existentes sem escrever. O salvamento utiliza revisão esperada e impressão digital da origem, além de comparação integral das tabelas dentro da transação. Conflitos interrompem a gravação. Revisão, sincronização das tabelas antigas e auditoria compõem a mesma transação. Dados compartilhados não usam localStorage. Rascunhos não confirmados ficam em memória com aviso e exportação; rascunhos confirmados são centrais. O histórico de passagens/checklist recebe data assistencial explícita.

APIs e módulos anteriores permanecem em funcionamento; /legado expõe suas ferramentas, /ficha-uti/ abre o novo componente. Campos sem equivalente visual continuam nos registros legados, com acesso às ferramentas anteriores. Conversas/dados de um paciente não são reaproveitados por outro ocupante do leito.

## Agente de IA

/api/pep/ai exige sessão válida e configuração OpenAI no servidor. Verifica patientId, episodeId, leito, versão, impressão digital e data; busca os registros centrais, chama Responses com store:false e schema estrito, valida tipos e identidade e confere novamente a origem após a requisição. Mudança de registro durante geração invalida a resposta. Prompts delimitam dados clínicos e vetam invenção de achados, negativas, normalidade, doses, datas e ações. Valores vazios não apagam dados existentes. Evolução e passagem têm revisão editável antes de aplicar. Extração retorna o mesmo contrato patient/admission/bed/days/cells do modelo.

A chamada real ao provedor NÃO foi comprovada. O teste automatizado usa resposta sintética simulada; não deve ser confundido com validação da credencial de produção. Nenhum dado de paciente foi usado como teste de IA.

## Validação

- Os quatro checks do ZIP passam: core-checks, prescricao-checks, ficha-history-checks e handoff-checks.
- Os 45 testes anteriores passaram.
- Testes adicionais cobrem migração virtual, persistência, conflitos, alta/nova admissão, transferência, oito dias, rascunhos, edição de evolução antiga, preservação de parâmetros de prescrição, compatibilidade legada, backup e contrato do agente. Dez testes novos passaram, além dos 45 anteriores (55 no total). A extração multimodal foi conferida no corpo enviado à API simulada; mudanças na origem durante a requisição foram rejeitadas.
- TypeScript e build Worker foram verificados após os ajustes finais.
- PDFs sintéticos: dez pacientes = cinco páginas; item único muito extenso = 17; checklist extenso = 20; ficha = uma página. A4 paisagem nas passagens, retrato na ficha; área 290 × 203 mm na passagem; tabela 198 mm na ficha; sem overflow de células ou caracteres fora da margem conservadora; último item íntegro; contagem DOM igual ao PDF.
- Comparação pixel a pixel: todas as páginas dos quatro cenários renderizadas idênticas às do código do ZIP com os mesmos dados sintéticos e configurações.
- Navegador Chromium: desktop 1440 px e celular 390 px, dez leitos, 11 datas na linha do tempo, ficha salva e recuperada após recarga, geração dos registros e revisão dos dez pacientes; sem erros JavaScript ou transbordamento horizontal. Autenticação foi testada no Worker compilado.
- O harness de PDFs usa Chromium e configurações de 100%, fundos ativados e cabeçalhos/rodapés desativados. Não implica teste de impressora física ou Safari/iOS real.

## Pendências que bloqueiam publicação

1. Backup integral verificável de produção: a ferramenta de leitura D1 retorna projeções com valores cortados; esse resultado foi rejeitado como backup. Nenhum backup parcial foi tratado como cópia recuperável. O endpoint existente /api/clinical?op=backup exige sessão interna autenticada, indisponível na inspeção programática atual.
2. Teste real OpenAI sintético: segredo existe, mas não é legível pela inspeção e uma chamada autenticada ao backend de produção ainda é necessária. A existência da variável e o build não demonstram funcionamento.
3. Reconciliação de produção antes/depois não foi executada, pois não houve migração/publicação. Ela deve comparar integralmente IDs, registros, relacionamentos, versões, textos e contagens do backup autorizado.

## Reversão

Reimplantar a versão 28 pelo ID salvo appgprj_6a768579d258819193cc791e89f7e89b~appgver_99c1e6cb5edc8191a3f43f60473384f9. O commit anterior permanece no histórico remoto; a cópia de código foi também verificada por git bundle. A nova tabela é aditiva e pode permanecer no banco durante reversão; não apagar revisões nem reverter dados clínicos para um snapshot antigo. As tabelas legadas continuam mantidas para compatibilidade. Restaurar dados somente a partir de backup integral reconciliado, com análise das gravações posteriores.

A preparação deve ser salva como versão revisável sem implantação enquanto qualquer pendência permanecer. Não afirmar “migração concluída”, “IA funcionando em produção” ou “site atualizado” antes dos critérios obrigatórios.
