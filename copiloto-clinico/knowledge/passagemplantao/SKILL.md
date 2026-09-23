---
name: passagemplantao
description: "Converte dados de prontuário, evoluções médicas e de enfermagem, prescrições, exames, balanço hídrico, dispositivos e intercorrências em passagem de plantão clínica estruturada e segura. Use quando o usuário invocar @passagemplantao/$passagemplantao ou pedir handoff, SBAR, resumo para troca de turno, round, lista de pacientes, pendências ou metas de 24 horas em UTI, enfermaria, pronto atendimento ou observação."
---

# Passagem de Plantão Clínica

Produzir handoff objetivo, cronológico, acionável e pronto para uso assistencial. Sintetizar sem reescrever uma evolução médica completa. Priorizar o estado atual, mudanças recentes, suportes, riscos, pendências e próximos passos.

## Execução

1. Integrar exclusivamente os dados fornecidos na conversa e nos anexos.
2. Ordenar registros por data/hora e aplicar [references/protocolo-handoff.md](references/protocolo-handoff.md). Usar o dado mais recente como estado atual e manter a tendência quando houver série temporal.
3. Selecionar em [references/formatos.md](references/formatos.md):
   - UTI completa;
   - enfermaria;
   - pronto atendimento/observação;
   - versão verbal ultracurta;
   - múltiplos pacientes.
4. Se o setor não estiver informado, inferir somente quando o contexto for inequívoco; caso contrário, usar o formato clínico geral.
5. Entregar somente a passagem final em Markdown, sem introdução ou explicação externa.

## Regras de segurança

- Não inventar diagnóstico, conduta, resposta terapêutica, exame, dispositivo, dose, velocidade de infusão, meta, pendência, prognóstico ou comunicação familiar.
- Usar `[não informado]` para dado essencial de segurança ausente: alergias, via aérea/suporte respiratório, drogas vasoativas, dispositivos críticos, precauções/isolamento e limitação de suporte quando pertinentes. Omitir campos opcionais sem dados.
- Não transformar hipótese em diagnóstico confirmado nem plano proposto em conduta executada.
- Não declarar estabilidade apenas por um conjunto isolado de sinais vitais. Descrever tendência e suporte atual quando disponíveis.
- Preservar unidades, doses, vias, frequências, parâmetros ventilatórios e velocidades de bomba exatamente como informados.
- Para antimicrobianos, registrar nome, indicação, data de início e dia de tratamento somente quando calculável. Não estimar dia de tratamento sem data-base.
- Para balanço hídrico, manter período, entradas, saídas, diurese e saldo; não misturar intervalos diferentes.
- Se fontes divergirem, apresentar o valor mais recente com data/hora e sinalizar a divergência clinicamente relevante. Não escolher silenciosamente.
- Separar evento concluído, pendência, meta e recomendação. Não criar ordem médica nova.
- Formular riscos e pontos de atenção apenas a partir dos problemas ativos ou suportes descritos. Não inventar limiares de intervenção.
- Manter nomes e dados identificadores apenas quando fornecidos e necessários para distinguir pacientes.
- Em múltiplos pacientes, nunca misturar exames, dispositivos, medicações ou pendências entre indivíduos.
