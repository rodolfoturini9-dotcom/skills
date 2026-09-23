# Formato obrigatório da resposta

Use exatamente os títulos e a ordem abaixo. Omitir subitens sem aplicabilidade é permitido, mas nunca omitir achados positivos, limitações ou o bloco final para prontuário.

# RELATÓRIO DE ANÁLISE ELETROCARDIOGRÁFICA

## 1. Avaliação Técnica e Qualidade do Sinal

- **Velocidade de varredura e ganho:** [valores identificados ou não informados].
- **Integridade do sinal e artefatos:** [qualidade, interferências e derivações afetadas].

## 2. Ritmo e Frequência Cardíaca

- **Ritmo predominante:** [descrição].
- **Frequência cardíaca:** [valor aferido/estimado e classificação].
- **Regularidade:** [regular, regularmente irregular ou irregularmente irregular].

## 3. Análise do Eixo Elétrico

- **Eixo do QRS no plano frontal:** [estimativa/classificação e elementos usados].

## 4. Mensuração dos Intervalos e Duração das Ondas

- **Onda P:** [duração, amplitude e morfologia, ou limitação].
- **Intervalo PR:** [valor/classificação].
- **Complexo QRS:** [duração, amplitude, morfologia e progressão de R].
- **Intervalo QT e QTc:** [valores, fórmula e classificação, ou limitação].

## 5. Análise Sistemática por Grupos Anatômicos

- **Derivações inferiores (DII, DIII e aVF):** [descrição].
- **Derivações laterais (DI, aVL, V5 e V6):** [descrição].
- **Derivações septais (V1 e V2):** [descrição].
- **Derivações anteriores (V3 e V4):** [descrição].

## 6. Repolarização Ventricular

- **Segmento ST:** [nivelamento, magnitude/morfologia, derivações e reciprocidade].
- **Onda T:** [polaridade e morfologia].
- **Onda U:** [presença e característica, somente quando visível].

## 7. Mapeamento de Achados Clínicos Relevantes

- **Achados positivos:** [lista objetiva com derivações].
- **Achados negativos relevantes:** [somente ausências demonstráveis e pertinentes].

## 8. Impressão Diagnóstica Final

- **Diagnóstico eletrocardiográfico principal:** [conclusão primária].
- **Diagnósticos secundários e alterações associadas:** [lista ou `não evidenciados`].

## 9. Limitações Técnicas da Imagem Registradas

- [restrições visuais e impacto específico na interpretação].

## TEXTO PRONTO PARA PRONTUÁRIO

Entregue sempre uma síntese factual e concisa dentro de uma caixa de código Markdown. Inclua data/horário somente quando legíveis ou fornecidos. Não acrescente comentários fora do texto clínico dentro da caixa.

```markdown
**Eletrocardiograma de [data], às [horário]:** Traçado [adequado/parcialmente limitado], realizado a [velocidade] e [ganho]. [Ritmo] com frequência cardíaca aproximada de [valor] bpm, [regularidade]. Eixo elétrico [classificação]. [Intervalos e condução]. [Principais achados morfológicos e de repolarização]. [Impressão diagnóstica objetiva]. [Limitação clinicamente relevante, se houver].
```

Regras para o texto de prontuário:

- Se data ou horário não estiverem disponíveis, use `data e horário não informados`; não invente.
- Não inclua medidas que não tenham sido aferidas ou estejam apenas presumidas.
- Não escreva `sem sinais de isquemia aguda` quando derivações críticas estiverem ilegíveis; descreva a limitação.
- Não use o bloco para recomendar tratamento ou substituir avaliação clínica.
- Quando houver achado potencialmente crítico, coloque-o no início da síntese.
