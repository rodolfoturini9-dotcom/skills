# Correção de persistência e revisão dos fluxos

Data: 30/09/2026. Projeto existente: appgprj_6a768579d258819193cc791e89f7e89b.
Base: versão 29, commit 0e13eaa8e3d35a596574c42602790fc87b2508f8.

## Causa reproduzida

Logs de produção registraram POST /api/pep com HTTP 400, em desktop e iPhone. A tabela pep_revisions existe e não havia revisões gravadas durante a inspeção. O runtime D1/Miniflare reproduziu o erro `D1_ERROR: Expression tree is too large (maximum depth 100): SQLITE_ERROR` no primeiro salvamento. Os testes anteriores usavam SQLite de Node, cujo limite não representava esse limite de D1. Foi uma lacuna de validação da implementação anterior.

A comparação integral das tabelas legadas na transação foi preservada. Os termos AND agora formam árvores balanceadas, reduzindo a profundidade sem enfraquecer a verificação de concorrência. Nenhuma tabela foi apagada, nenhum paciente foi alterado como teste e nenhuma nova migração é necessária para esta correção.

## Outros ajustes

- Requisições de salvamento têm ID estável: repetir após perda de resposta não duplica revisões/tarefas.
- A fila mantém o lote pendente até confirmação; botão Tentar salvar novamente. Recarregar durante envio é bloqueado e o rascunho exportado inclui o lote pendente.
- Admissão não pode ser reenviada enquanto aguarda os IDs do servidor.
- Os registros legados de evolução usam horários estáveis da origem, evitando que GETs iguais invalidem artificialmente a conferência anterior à IA.
- Campos temporários de extração, prévias de evolução e parâmetros de prescrição são limpos ao mudar de paciente/episódio.
- O painel seleciona a data novamente quando muda a identidade, inclusive no mesmo leito.
- A geração da passagem usa somente os dez leitos oficiais, excluindo a cópia virtual de consulta arquivada.
- Resposta externa da passagem deve incluir todos os pacientes selecionados e data válida; geração/revisão invalidada se os registros mudarem.
- O catálogo anterior é recomputado quando sua origem muda.
- Erros de API possuem referência técnica e logs de fase/categoria, sem textos clínicos ou credenciais.

## Validação

Testes D1 reais locais: primeira gravação com dez leitos e todas as colunas; salvamento/recarga de ficha e evolução; repetição de requisição sem duplicação; alteração concorrente de origem impedindo todas as escritas.

60 testes do projeto aprovados (incluindo três testes no runtime D1) e quatro checks do ZIP aprovados. TypeScript e build passaram. Harness de navegador verifica desktop/celular, dez leitos, histórico, revisão da passagem, salvamento/recarga e repetição após resposta perdida. Não se deve confundir esse ambiente sintético com gravação autenticada em produção.

## Limites e reversão

A senha e os segredos de produção não foram modificados. A integração real OpenAI ainda depende de teste por sessão interna autenticada. O backup integral de produção não foi obtido pela ferramenta de leitura, que corta valores. A correção é de código e não transforma essa leitura em backup.

A versão 29 é o ponto anterior de publicação desta correção; a versão 28 também permanece salva. Não usar a versão 29 como solução de salvamento, pois contém o defeito reproduzido. Em reversão, preservar pep_revisions e todas as gravações posteriores; não restaurar dados clínicos automaticamente a snapshots antigos.
