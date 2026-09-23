---
name: evolucaouti
description: Gera evolução médica diária de UTI em Markdown a partir de texto, prontuário e anexos, usando um template fixo e omitindo campos sem fonte. Use quando o usuário solicitar evolução de UTI, round de UTI ou consolidação diária para prontuário; não use para admissão, prescrição, relatório de alta ou parecer isolado.
---

# Evolução UTI Inteligente

Produza uma evolução médica diária de UTI fiel aos registros fornecidos, pronta para colar no prontuário eletrônico.

## Fluxo obrigatório

1. Leia integralmente o texto e todos os anexos acessíveis antes de redigir.
2. Extraia cada dado com seu contexto temporal, origem e unidade quando presentes.
3. Consolide informações repetidas sem duplicação. Quando houver versões sucessivas, use a mais recente somente se a cronologia estiver explícita.
4. Preencha o [template de evolução](references/template-uti.md) mantendo a ordem dos títulos.
5. Faça uma revisão final de fidelidade e omissão antes de responder.

## Fidelidade documental

- Use somente fatos expressamente presentes nas fontes fornecidas nesta solicitação.
- Não invente, estime, complete por plausibilidade nem converta ausência de registro em achado negativo.
- Não deduza diagnóstico, causalidade, estabilidade clínica, resposta terapêutica ou conduta apenas a partir de medicamentos, exames ou dispositivos.
- Não calcule valores derivados, inclusive índice de oxigenação, balanço hídrico, débito urinário por peso, dia de antimicrobiano ou parâmetros ventilatórios, salvo se o usuário pedir expressamente o cálculo e fornecer todos os dados necessários.
- Pode integrar, condensar e redigir tecnicamente informações explícitas, sem acrescentar conteúdo clínico novo.
- Condutas, metas, prognóstico, limitações terapêuticas e comunicação familiar só entram quando estiverem documentados. Não ofereça recomendações novas dentro da evolução.
- Classifique um diagnóstico como resolvido somente se isso estiver explícito.
- Se informações conflitarem e a cronologia não resolver o conflito, não escolha silenciosamente uma delas. Registre a divergência de forma factual no bloco pertinente apenas quando clinicamente necessária; caso contrário, omita o dado conflitante.
- Se um anexo relevante estiver ilegível ou inacessível, informe o impedimento de modo breve fora da evolução e não tente reconstruir seu conteúdo.

## Regras de omissão inteligente

- Remova todos os placeholders e qualquer pontuação, separador, rótulo, unidade ou fragmento que ficaria sem valor.
- Omita cada item sem informação. Não escreva “não informado”, “sem dados”, “não descrito”, “não disponível” ou equivalentes.
- Inclua uma seção ou subseção apenas quando ao menos um item dela tiver conteúdo válido.
- Em uma linha composta, preserve somente os segmentos preenchidos e ajuste os separadores. Exemplo: se houver nome, mas não leito, escreva apenas `# Paciente: NOME`.
- Em intervalos, não transforme um único valor em mínimo e máximo. Se houver apenas uma medida, apresente-a como valor único.
- Não inclua títulos vazios, listas vazias, marcadores órfãos ou numeração descontínua.
- Em “Eventos das últimas 24 horas”, escreva “Sem intercorrências agudas relevantes registradas nas últimas 24 horas” somente se a fonte declarar expressamente ausência de intercorrências. A simples falta de eventos no material não autoriza essa afirmação; nesse caso, omita a seção.
- Em “Exames complementares”, inclua apenas as subseções que contenham resultados. Não inclua exame apenas solicitado ou pendente como resultado; encaminhe-o a “Pendências” ou “Condutas” somente se isso estiver documentado.

## Tempo e terminologia

- Restrinja controles e eventos à janela das últimas 24 horas quando a fonte permitir distingui-la.
- Preserve datas e horários explícitos. Padronize datas completas inequívocas como `dd/mm/aaaa` e horários como `HH:mm`.
- Use terminologia médica padronizada e linguagem factual, descritiva e impessoal, como se o texto tivesse sido redigido pelo médico solicitante.
- Preserve doses, vias, velocidades de infusão, parâmetros, calibres, fixações e unidades exatamente como documentados; não normalize uma unidade duvidosa.
- Evite abreviações não oficiais. Abreviações clínicas usuais já presentes no template podem ser mantidas.

## Formato da resposta

- Entregue somente a evolução final dentro de um único bloco de código Markdown.
- Não acrescente introdução, justificativa, observações, fontes ou sugestões após o bloco.
- Mantenha a ordem dos títulos e itens remanescentes do template.

## Verificação final

Antes de responder, confirme:

- cada afirmação tem suporte explícito na entrada;
- não restou placeholder ou campo vazio;
- não há seção, subtítulo, marcador, unidade ou separador órfão;
- dados das últimas 24 horas não foram misturados com registros anteriores sem indicação;
- condutas propostas não foram confundidas com condutas efetivamente registradas;
- a saída contém um único bloco de código Markdown.
