---
name: admissaoped
description: Gerar admissão hospitalar pediátrica em enfermaria a partir dos dados clínicos, exames e anexos enviados em qualquer ponto da conversa. Usar quando o usuário chamar @admissaoped, $admissaoped ou solicitar admissão de criança ou adolescente avaliado no pronto atendimento; não usar para paciente adulto, evolução diária, prescrição ou alta.
---

# Admissão pediátrica em enfermaria

Gerar uma admissão pediátrica factual, tecnicamente padronizada e pronta para o prontuário eletrônico.

## Fluxo obrigatório

1. Revisar toda a conversa atual desde o início, incluindo mensagens, anexos, imagens, documentos, exames e laudos já apresentados.
2. Reunir todas as informações pertinentes ao paciente pediátrico, ainda que tenham sido enviadas em mensagens separadas ou antes da invocação. Integrar também os dados enviados junto de `@admissaoped`.
3. Priorizar dados diretamente fornecidos pelo usuário e dados primários dos anexos. Conferir análises anteriores do assistente com o anexo quando ele estiver acessível.
4. Aplicar correções e atualizações posteriores sobre o dado anterior correspondente, preservando informações não modificadas.
5. Não misturar pacientes. Se houver mais de um caso no chat, usar o paciente pediátrico mais recentemente indicado; diante de ambiguidade real, fazer uma única pergunta objetiva de identificação.
6. Não exigir reenvio de dados já acessíveis na conversa.
7. Ler e aplicar integralmente o [template de admissão pediátrica](references/template-admissao.md).
8. Revisar fidelidade, coerência temporal, formatação e ausência de campos-modelo antes de responder.

## Integridade clínica

- Usar exclusivamente os dados da conversa atual, os anexos e os padrões de normalidade autorizados no template.
- Não inventar cronologia, sintomas, negativas, sinais vitais, peso, antecedentes, tratamentos, resultados ou circunstâncias não fornecidas.
- Não transformar ausência de menção na história clínica em negativa. As únicas substituições autorizadas por ausência de informação são APP, MUCs, alergias e os padrões de exame físico definidos no template.
- Preservar idade, sexo, peso, fonte da história, procedência, forma de encaminhamento, datas e horários quando informados.
- Não criar valores numéricos nem classificar frequência cardíaca, frequência respiratória, pressão arterial ou temperatura sem idade e valor documentados.
- Quando um sistema do exame físico não tiver qualquer descrição, inserir integralmente e sem abreviar o respectivo parágrafo normal do template.
- Não considerar sintomas históricos ou relato do responsável, isoladamente, como descrição do exame físico atual. Por exemplo, febre domiciliar sem temperatura na admissão não autoriza suprimir “afebril” do padrão Geral.
- Quando um sistema tiver dados parciais, preservar os achados fornecidos e completar somente os componentes restantes do padrão normal que não os contradigam.
- Substituir ou remover parte do padrão normal somente quando houver achado atual de exame físico, sinal vital ou estado clínico explicitamente documentado e incompatível com essa parte.
- Não incluir condutas, prescrição, plano terapêutico ou explicações fora do template.

## História clínica

- Iniciar diretamente pela história da moléstia atual, sem título.
- Redigir texto técnico, coeso e cronológico, incluindo somente fatos clinicamente relevantes.
- Identificar o responsável como fonte da história quando isso constar nos dados.
- Não acrescentar sintomas associados ou negativas que não tenham sido relatados.

## Exames complementares

- Omitir completamente o bloco `# EXAMES COMPLEMENTARES:` quando nenhum resultado tiver sido enviado em texto ou anexo.
- Não apresentar exame apenas solicitado, pendente ou ilegível como resultado.
- Extrair somente valores legíveis e apresentar todos os exames laboratoriais da mesma coleta em uma única linha, sem unidades.
- Usar `- Laboratório DD/MM/AA:` quando a data estiver disponível. Se a data não constar, usar `- Laboratório [data não informada]:` sem estimá-la.
- Apresentar os analitos efetivamente informados, nesta ordem quando presentes: `Hb`, `Ht`, `Leuco`, `Plaq`, `Na`, `K`, `Cr`, `Ur`, `PCR`, `Procalcitonina`; acrescentar outros exames pelo nome padronizado, sem escrever literalmente “Outros”.
- Separar os resultados por ` | `.
- Estruturar ECG, Raio-X, USG, TC e outros exames em itens próprios, preservando linguagem probabilística do laudo.

## Hipóteses diagnósticas

- Definir as hipóteses de forma independente a partir da faixa etária, história, exame físico e exames complementares.
- Não copiar nem aceitar automaticamente hipóteses fornecidas pelo usuário. Permitir coincidência somente quando a análise independente dos dados a sustentar.
- Ordenar as hipóteses por relevância clínica e compatibilidade com o caso.
- Usar nomenclatura pediátrica padronizada e qualificar adequadamente diagnósticos ainda incertos.
- Apresentar somente os nomes das hipóteses como itens iniciados por hífen, sem explicações, justificativas, links ou referências.
- Não inventar hipótese rara ou sem suporte apenas para preencher um segundo item. Incluir somente hipóteses defensáveis pelos dados disponíveis.

## Formato da resposta

- Entregar somente um único bloco de código identificado como `markdown`, sem introdução ou conclusão fora dele.
- Manter exatamente a ordem do template.
- Não imprimir placeholders, instruções, colchetes ou campos vazios.
- Omitir apenas o bloco de exames complementares quando não houver exames; manter os demais blocos obrigatórios.
