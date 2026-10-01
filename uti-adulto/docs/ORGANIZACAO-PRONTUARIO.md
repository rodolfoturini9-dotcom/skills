# Organização do prontuário da internação

Base: versão 30, commit 2855c7eba3042683bdd7265b228a823e2cbf731b. Projeto e endereço existentes preservados.

No painel do paciente, “Resumo e organização da internação” reúne três caminhos:

- Reunir todos os dias dos registros: transcrição determinística das evoluções salvas, ficha, notas e passagens por data. Não depende de API. Não cria evolução retrospectiva nem calcula valores.
- Organizar prontuário com IA: usa o endpoint autenticado existente, OpenAI Responses, gpt-5-mini, store:false e segredo do servidor. O contrato estruturado novo acrescenta a operação organize_chart sem alterar os contratos de extração, evolução e passagem anteriores.
- Copiar prompt de organização: inclui somente a internação escolhida, fontes de todos os dias, documentação adicional, identificadores estáveis, data de admissão, token de revisão e contrato JSON. A resposta pode ser colada em JSON puro ou caixa Markdown.

Todas as rotas de organização abrem revisão editável. O resumo global fica separado dos registros diários. As seções diárias alimentam a evolução, os cartões do painel e HD/HMP/HMA/CD/Pendências da passagem da mesma data. A folha continua com seis colunas; os demais dias ficam em dailyRecords e no histórico.

## Preservação e concorrência

Nenhuma tabela ou credencial nova. Não há migração de banco ou limpeza de dados. A persistência usa pep_revisions e clinical_audit existentes. Fichas e evoluções continuam sincronizadas com as tabelas legadas daily_sheets e evolutions. Campos antigos sem equivalente permanecem nos registros.

A ação IMPORT_CHART é uma transação exclusiva, com versão global e SHA-256 do prontuário revisado. Valida paciente, episódio, nome, leito, admissão, datas possíveis e não anteriores à admissão, duplicidades, tipos, linhas e slots. A geração por API confere a origem antes e depois da chamada. Troca de paciente/episódio limpa a entrada e cancela a requisição. Alteração da origem invalida a revisão. Requisições de salvamento continuam com idempotência.

Campos vazios preservam os existentes. Conflitos de ficha mantêm o valor existente por padrão; substituição exige escolha na revisão. Evoluções podem ser complementadas, mantidas ou substituídas com histórico. Resumos mantêm versões. As passagens mesclam itens, conservam overrides e checklist, sem concluir tarefas. Importar dia antigo não substitui a referência clínica mais recente. Prescrições não são recalculadas nem alteradas.

Autoria vem do mecanismo autenticado existente (“Usuário autenticado”), atribuída pelo servidor, sem aceitar autor ou horário forjado pelo frontend. A revisão e a documentação adicional ficam rastreáveis no snapshot central. Nada é enviado automaticamente à IA externa: o botão copia o prompt, cabendo ao usuário escolher o serviço autorizado.

## Ajustes de organização textual

Textos narrativos em caixa alta não são descartados como títulos. Rótulos conhecidos, títulos com # e títulos com dois-pontos continuam organizando as seções. “Condutas e metas” alimenta condutas, sem ser confundido com a seção de pendências.

## Validação e limites

73 testes do projeto e os quatro checks do ZIP passaram. Testes de núcleo e backend verificam dez dias, datas e identidades divergentes, ausência de aplicação parcial, conflitos, conteúdo vazio, autoria, histórico e recuperação. O runtime D1 local confirma a transação. Navegador desktop/celular verifica prompt copiado, reunião dos registros, JSON Markdown, rejeição de outra internação, revisão editada, salvamento e recarga do resumo, ficha, evolução e passagem. Os checks originais continuam válidos; não houve modificação nos componentes de impressão.

A integração do novo agente foi verificada por contrato com resposta sintética simulada. A chamada real com a chave de produção continua pendente de sessão interna autenticada; não se afirma teste real da API. O teste sintético não altera pacientes reais. Backup integral verificável da produção permanece uma limitação anterior da ferramenta de leitura. Esta alteração não modifica o esquema nem migra registros existentes.

Limites explícitos: documentação adicional 120000 caracteres, célula 300, até 3650 datas, solicitação de salvamento 3 MB e estado 10 MB (limites existentes). O contexto do novo agente tem limite de 700000 caracteres; não há truncamento silencioso. Conteúdo maior exige dividir a organização em períodos e revisar, conservando IDs e datas. O resumo sem API apresenta os registros, não produz síntese clínica interpretativa.

## Reversão

Republicar a versão 30 restaura a interface anterior. Preservar pep_revisions e os dados gravados posteriormente. Não restaurar o banco automaticamente a um snapshot antigo. Os campos novos permanecem armazenados mesmo quando a interface anterior não os exibe.
