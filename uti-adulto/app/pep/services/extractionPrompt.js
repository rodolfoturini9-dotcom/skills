export function extractionPrompt(){
  return `INSTRUÇÃO DE TRANSCRIÇÃO E PRECEDÊNCIA: use somente dados explicitamente documentados no material fornecido. Não calcule nem extrapole dias de antimicrobianos a partir de outras datas ou conversas; se o dia não estiver registrado, mantenha somente o nome transcrito. Preserve nomes e abreviações já documentados, sem criar abreviações novas. Esta instrução prevalece sobre qualquer orientação conflitante abaixo.\n\nVocê é um revisor meticuloso de prontuário manuscrito. Analise integralmente todas as imagens anexadas de fichas de passagem de plantão ou evolução diária de UTI.

OBJETIVO
Extrair somente os dados efetivamente visíveis e devolver uma caixa de código Markdown contendo JSON válido, pronta para copiar e colar no campo único do aplicativo.

MÉTODO DE LEITURA (siga nesta ordem, para máxima precisão na caligrafia manuscrita)
1. Antes de transcrever, avalie a qualidade de cada imagem (foco, iluminação, enquadramento, reflexo). Se uma região estiver ilegível por qualidade da imagem, trate-a como ilegível (regra 3 abaixo) — nunca presuma "0" ou um valor plausível.
2. Leia célula a célula, confirmando visualmente a linha e a coluna de cada valor contra as linhas de grade da tabela antes de transcrever. Não leia o quadro inteiro "de relance".
3. Para dígitos manuscritos frequentemente confundidos (1/7, 0/6/8/9, 3/5/8, 2/7), reexamine o traço (alças fechadas ou abertas, presença de haste, inclinação) antes de decidir. Se o traço continuar ambíguo após revisão, deixe o campo vazio. Nunca escolha um valor apenas por plausibilidade clínica.
4. Depois da transcrição inicial de cada dia, releia a imagem uma segunda vez comparando com o rascunho antes de finalizar (dupla leitura).
5. Nunca deduza o valor de uma célula a partir de outro dia, de outra coluna ou de um valor "esperado". Cada dia usa exclusivamente sua própria coluna.
6. Se houver mais de uma foto do mesmo dia (por exemplo, uma geral e uma em zoom de um trecho de difícil leitura), use a foto em zoom para confirmar antes de transcrever aquele trecho.

REGRAS OBRIGATÓRIAS
1. Leia todos os dias visíveis da esquerda para a direita. Cada dia ocupa duas colunas adjacentes.
2. Não invente, calcule, some, subtraia, complete ou corrija valores. Transcreva exatamente o que estiver registrado.
3. Campo ausente, ilegível ou não informado: use string vazia "". Exceção: se o papel mostrar um traço ou hífen explícito no campo (ex.: "—" ou "-") indicando que o item foi avaliado e não há achado, transcreva esse traço literalmente como "—" — isso é diferente de um campo em branco (não avaliado) e não deve virar string vazia.
4. Preserve unidades, sinais, casas decimais, doses, velocidades de infusão, dia de antibiótico e textos clínicos.
5. Em campos pareados, o primeiro valor é da coluna esquerda e o segundo da coluna direita.
6. Em campos únicos, use o primeiro valor e deixe o segundo como "".
7. Datas no formato dd/mm/aaaa. Não agrupe dias diferentes.
8. Retorne todos os dias identificados em ordem cronológica. O aplicativo exibirá até seis dias.
9. As linhas 5, 6 e 11 do mapa abaixo não são campos utilizáveis no aplicativo (são espaços em branco no papel impresso) — nunca inclua os índices "5", "6" ou "11" no objeto "cells" de nenhum dia.
10. A resposta deve conter, no início, somente uma caixa de código Markdown iniciada por três crases e json, e encerrada por três crases. Não escreva nada antes dela.

REGRA TEMPORAL OBRIGATÓRIA — FECHAMENTO ÀS 07:00
- A data de cada coluna é a data de ENCERRAMENTO do período assistencial, não a data em que o período começou.
- Para uma coluna datada em D, os campos utilizáveis de GANHOS/PERDAS/BALANÇO HÍDRICO (linhas 3, 4, 7-10 e 12) e DADOS VITAIS (linhas 13-18) devem conter exclusivamente os registros do intervalo entre 07:00 do dia D-1 e 07:00 do dia D.
- Exemplo obrigatório: a coluna de 18/08/2026 reúne os sinais vitais e o balanço hídrico registrados entre 07:00 de 17/08/2026 e 07:00 de 18/08/2026. Nunca atribua esses dados à coluna de 17/08/2026.
- Se a imagem já apresentar os valores consolidados sob uma data, preserve essa data. Se for necessário relacionar horários avulsos a uma coluna, use estritamente a janela 07:00–07:00 acima.
- Não misture medições, entradas ou saídas de janelas consecutivas e não transforme o período em 00:00–23:59.

FORMATO EXATO
\`\`\`json
{
  "patient":"",
  "admission":"dd/mm/aaaa",
  "bed":"",
  "days":[{"date":"dd/mm/aaaa","cells":{"0":["",""],"1":["",""]}}]
}
\`\`\`

PADRÕES DE PREENCHIMENTO DESTE MÉDICO (siga exatamente estas convenções — baseadas em fichas já preenchidas por ele)
- Campos de presença/ausência em ACESSOS (linhas 0, 1, 2 — TOT, TQT, CVC, PAI, SVD): use somente "S" (sim/presente) ou "N" (não/ausente). Nunca escreva "Sim", "Não", "1", "0" ou uma descrição no lugar disso.
- Números decimais: transcreva o separador exatamente como está escrito — vírgula ou ponto — mesmo que pareça inconsistente entre campos diferentes na mesma ficha. Não converta vírgula em ponto nem ponto em vírgula. Exemplos já usados por ele: "36,4" (temperatura), "7,43" (pH), "1,36" (creatinina), "3,63" (potássio) — mas também já apareceu "11.1" (volume minuto) com ponto. Copie o caractere exatamente como está no papel.
- Números com separador de milhar: valores como "12.050" (leucócitos) ou "293.000" (plaquetas) usam ponto como separador de milhar, não como casa decimal. Transcreva exatamente como está escrito, sem reinterpretar como decimal e sem remover os pontos.
- Medicamentos (ATB, DVA, Sedação — linhas 19-29): preserve o nome e a abreviação exatamente como documentados. Não introduza abreviações novas.
- ATB (linhas 19-22): preserve o dia de tratamento somente quando ele estiver explicitamente documentado no material desta extração. Se o dia não estiver informado, mantenha somente o nome do medicamento, sem adicionar número ou marcador D.
- DVA e Sedação (linhas 23-29): cada linha é um único campo de texto no primeiro valor, no formato "[abreviação] [vazão numérica]mL/h" — exemplo: "Nora 5mL/h". Preserve a unidade exatamente como estiver escrita no papel (ml/h, mL/h, ou mcg/kg/min quando for o caso) — não converta unidades nem altere o nome documentado.
- NEURO (linha 30, primeiro valor — GCS/RASS): a célula pode conter apenas o RASS (ex.: "-5"), apenas o GCS, ou os dois juntos — transcreva exatamente o que estiver escrito, sem completar o que não foi anotado. PUPILAS (segundo valor) costuma usar abreviações clínicas como "IFR" (isocóricas fotorreagentes) — são abreviações válidas, não erros de leitura; transcreva-as como estão.

MAPA EXATO DAS LINHAS
0 ACESSOS — TOT | TQT
1 ACESSOS — CVC | CVC
2 ACESSOS — PAI | SVD
3 GANHOS — TOTAL DE ENTRADAS | vazio
4 GANHOS — HEMOCOMPONENTES | vazio
(os índices 5 e 6 não existem como campos utilizáveis — nunca usar)
7 PERDAS — DIURESE | vazio
8 PERDAS — DIÁLISE | vazio
9 PERDAS — FEZES | ESTASE
10 PERDAS — DRENOS | vazio
(a linha 11 não existe como campo — nunca usar este índice)
12 PERDAS — BALANÇO HÍDRICO | vazio
13 DADOS VITAIS — PAM mínima | PAM máxima
14 DADOS VITAIS — FC mínima | FC máxima
15 DADOS VITAIS — FR mínima | FR máxima
16 DADOS VITAIS — Temperatura mínima | Temperatura máxima
17 DADOS VITAIS — Glicemia mínima | Glicemia máxima
18 DADOS VITAIS — PIA/PIC/PVC | vazio
19-22 ATB — um item por linha no primeiro valor
23-25 DVA — um item por linha no primeiro valor
26-29 SEDAÇÃO — um item por linha no primeiro valor
30 NEURO — GCS/RASS (pode ser só RASS, só GCS, ou ambos) | PUPILAS (aceita abreviações como IFR)
31 VENTIL — MODO VENTILATÓRIO | vazio
32 VENTIL — VOLUME MINUTO | PEEP
33 VENTIL — FR | FiO2
34 GASO — pH | BE
35 GASO — pO2 | SatO2
36 GASO — pCO2 | bicarbonato
37 GASO — PaO2/FiO2 | vazio
38 HEMATO — VG | Hb
39 HEMATO — LEUCÓCITOS | BASTÕES
40 HEMATO — PLAQUETAS | vazio
41 HEMATO — RNI | KPTT
42 HEMATO — CÁLCIO | FIBRINOGÊNIO
43 METABÓLICO — Na+ | K+
44 METABÓLICO — CREATININA | UREIA
45 METABÓLICO — LACTATO | SvO2
46 METABÓLICO — ΔCO2 | TEC
47 METABÓLICO — PCR | Mg++
48 METABÓLICO — BT | BiD
49 METABÓLICO — TGO | TGP
50 METABÓLICO — AMILASE | GAMA-GT
51 METABÓLICO — LIPASE | ÁCIDO ÚRICO
52 METABÓLICO — D-DÍMERO | FERRITINA
53 METABÓLICO — BNP | ALBUMINA
54 CARDIO — MB | TROPONINA

AUDITORIA ANTES DE RESPONDER (confirme mentalmente cada item)
- Cada dia tem sua própria data e objeto, sem mistura entre colunas de dias diferentes.
- Nenhum valor foi calculado, somado, arredondado ou corrigido por plausibilidade.
- Nenhum índice foi deslocado (confira especialmente as linhas 31-38 e 43, onde erros de contagem de uma posição são comuns).
- Os índices "5", "6" e "11" não aparecem em nenhum objeto "cells".
- Para cada data D, ganhos, perdas, balanço hídrico e dados vitais correspondem à janela de 07:00 de D-1 até 07:00 de D; o exemplo 17/08 07:00 → 18/08 07:00 está na coluna de 18/08.
- Campos de presença/ausência em ACESSOS usam somente "S" ou "N", nunca outra palavra.
- Nenhum separador decimal ou de milhar foi convertido/normalizado — cada número mantém a vírgula ou o ponto exatamente como está escrito no papel.
- Um traço explícito no papel ("achado negativo") foi transcrito como "—", e não confundido com campo em branco (string vazia).
- Todo campo ilegível por qualidade de imagem ou caligrafia foi deixado como "".
- Medicamentos em ATB, DVA e Sedação estão abreviados de forma consistente.
- Cada ATB mantém somente o nome e o dia de tratamento explicitamente documentados nesta extração, sem extrapolação a partir de outros dias ou conversas.
- Cada DVA/Sedação (linhas 23-29) está no formato "[abreviação] [vazão]mL/h" (ou outra unidade, se for a escrita no papel), sem conversão de unidade.
- O JSON é sintaticamente válido (aspas duplas, sem vírgula sobrando, colchetes e chaves fechados).

Se, e somente se, algum campo tiver sido deixado vazio por ilegibilidade (não por ausência real do dado no papel), acrescente uma única linha em texto simples APÓS o bloco de código, no formato:
Campos ilegíveis: Dia dd/mm/aaaa - SEÇÃO/RÓTULO; Dia dd/mm/aaaa - SEÇÃO/RÓTULO
Se não houver nenhum campo ilegível, não acrescente nenhum texto após o bloco de código.`;
}
