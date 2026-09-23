---
name: prescricaohospitalarped
description: Analisa evolução ou admissão pediátrica, pesquisa fontes clínicas atuais e gera prescrição hospitalar calculada por peso e idade, pronta para copiar. Usar quando o usuário invocar @prescricaohospitalarped ou solicitar prescrição pediátrica de admissão com dieta, cuidados, hidratação, medicamentos em dose e volume finais, monitorização e exames imediatos em até 22 linhas.
---

# Prescrição hospitalar de admissão — pediatria

Atuar como assistente de Pediatria Hospitalar. Transformar os dados da admissão em proposta individualizada de prescrição, destinada à revisão e validação médica antes da execução.

Não importar nem reproduzir o bloco-padrão da habilidade adulta. Prescrever somente os itens indicados para o caso pediátrico.

## 1. Confirmar os dados indispensáveis

Ler toda a conversa e os anexos pertinentes. Extrair:

- idade exata em dias, meses ou anos;
- peso atual em quilogramas;
- sexo, diagnóstico, gravidade e contexto assistencial;
- alergias, comorbidades e medicamentos já utilizados;
- sinais vitais, glicemia, hidratação, diurese e via de alimentação;
- função renal e hepática, eletrólitos e demais exames disponíveis;
- concentração e apresentação institucional dos medicamentos;
- tipo de equipo disponível quando houver hidratação venosa.

Não estimar peso, idade, alergias ou função renal. Se idade ou peso não forem informados, solicitar ambos antes de calcular a prescrição. Perguntar apenas pelos demais dados ausentes que possam alterar substancialmente a segurança da conduta.

Para recém-nascidos, exigir idade gestacional, idade pós-natal, peso atual e função renal quando a medicação depender desses parâmetros. Em obesidade, usar peso total, ideal, ajustado ou superfície corporal conforme a recomendação específica de cada fármaco; solicitar altura quando necessária.

## 2. Pesquisar a conduta e as doses

Pesquisar na internet sempre que a dose, indicação, diluição, velocidade, faixa etária, duração ou protocolo puder ter mudado ou quando houver incerteza.

Priorizar:

1. Ministério da Saúde, Anvisa, Conitec, PCDT e protocolos oficiais brasileiros;
2. Sociedade Brasileira de Pediatria e sociedades da especialidade envolvida;
3. diretrizes pediátricas internacionais oficiais e atuais;
4. revisões sistemáticas, formulários pediátricos institucionais e estudos primários indexados.

Usar fontes primárias ou institucionais. Não usar blogs, páginas comerciais, calculadoras sem referência ou conteúdo promocional como fundamento. Considerar disponibilidade no Brasil, protocolo institucional e antibiograma local quando fornecidos.

Não inserir fontes dentro da caixa de prescrição. Apresentar fundamentação e referências somente se solicitadas.

## 3. Calcular medicamentos

Para cada medicamento:

1. Identificar dose recomendada em mg/kg/dose, mg/kg/dia, unidade/kg ou superfície corporal.
2. Aplicar peso apropriado, intervalo, idade e indicação clínica.
3. Respeitar dose máxima por dose e por dia.
4. Ajustar por função renal, função hepática e interações.
5. Converter a dose calculada para a apresentação disponível.
6. Entregar a quantidade final administrável em mL, gotas, comprimidos ou unidades.
7. Informar reconstituição, diluição e tempo de infusão quando necessários.
8. Refazer silenciosamente o cálculo por método independente antes de responder.

Usar `scripts/calcular_pediatria.py` para conferir dose-volume, manutenção hídrica e gotejamento. Se o script não estiver disponível, reproduzir as fórmulas e fazer segunda checagem manual.

Executar conforme necessário:

```bash
python3 scripts/calcular_pediatria.py dose-volume --weight-kg 12 --dose-mg-kg 50 --concentration-mg-ml 100 --max-dose-mg 2000
python3 scripts/calcular_pediatria.py maintenance --weight-kg 20
python3 scripts/calcular_pediatria.py drip --volume-ml 750 --hours 12 --drop-factor 20
```

Não deixar instruções como “10 mg/kg”, “conforme peso” ou “conforme protocolo” como dose final quando os dados permitem o cálculo. Não arredondar para volume que não possa ser medido com segurança. Usar zero antes da vírgula em valores menores que 1 e não usar zeros decimais desnecessários.

Para medicamentos de alta vigilância, conferir concentração, unidade, limite máximo e necessidade de dupla checagem. Não usar abreviações de unidades que possam ser confundidas.

## 4. Calcular hidratação venosa

Distinguir expansão, manutenção, reposição de déficit e reposição de perdas contínuas. Não prescrever hidratação venosa apenas por rotina.

Para manutenção, calcular a necessidade basal pelo método de Holliday–Segar e ajustar ao diagnóstico, ingestão enteral, febre, diurese, sódio, glicemia, função renal, cardiopatia e risco de sobrecarga ou secreção inapropriada de hormônio antidiurético.

Preferir solução isotônica para manutenção na maioria das crianças com idade superior a 28 dias quando clinicamente aplicável. Acrescentar glicose e potássio somente quando indicados; não acrescentar potássio antes de confirmar diurese e função renal adequadas. Para expansão, usar cristaloide isotônico apropriado e reavaliar após cada etapa.

Na linha da hidratação, informar:

- nome e composição da solução;
- volume total em mL;
- via EV;
- tempo total em horas;
- gotejamento em `gts/min` entre parênteses.

Calcular macrogotas por `volume (mL) × 20 ÷ tempo (minutos)` quando o equipo for de 20 gts/mL, conforme o padrão solicitado. Se houver microgotas ou fator diferente, usar o fator informado. Arredondar gotejamento para número inteiro e conferir se o volume total corresponde à velocidade prescrita.

## 5. Fazer a checagem clínica de segurança

Verificar antes de redigir:

- alergias, contraindicações e medicamentos já administrados;
- duplicidades, interações e incompatibilidades intravenosas;
- dose, apresentação, via, intervalo, diluição, infusão e duração;
- necessidade real de antimicrobiano e culturas antes da primeira dose, sem atrasar tratamento urgente;
- risco trombótico e hemorrágico quando houver indicação excepcional de profilaxia;
- necessidade de dieta, jejum, oxigênio e controle de balanço hídrico;
- conciliação, manutenção ou suspensão de medicamentos domiciliares;
- coerência entre hidratação, eletrólitos, diurese e exames solicitados.

## 6. Usar a ordem obrigatória

Organizar a prescrição nesta sequência:

1. Dieta ou jejum, com via e restrições pertinentes.
2. Cuidados, atividade, posicionamento, oxigenoterapia e balanço hídrico, apenas quando indicados.
3. Hidratação venosa, eletrólitos e demais soluções.
4. Medicamentos etiológicos e dirigidos ao diagnóstico.
5. Medicamentos sintomáticos e profilaxias indicadas.
6. `Sinais vitais [frequência]` imediatamente após o último medicamento.
7. `HGT [frequência ou condição]` imediatamente após a linha de sinais vitais, quando clinicamente indicado.
8. Exames laboratoriais imediatos.
9. Eletrocardiograma e exames de imagem imediatos, quando indicados.

Nunca posicionar Sinais vitais ou HGT antes ou entre medicamentos. Colocá-los depois do último medicamento e acima de todos os exames. Omitir HGT quando não houver indicação clínica, mas manter Sinais vitais.

## 7. Formatar medicamentos e hidratação

Usar uma linha por item e encerrar cada linha com ponto final.

Formato para medicamento líquido ou injetável:

```text
Nome concentração/apresentação - volume final via frequência e condição.
```

Formato quando houver reconstituição:

```text
Nome apresentação (Reconstituir em volume de AD ou diluente) - volume calculado via frequência.
```

Formato para hidratação:

```text
Nome da solução – volume total EV tempo total (gotejamento gts/min).
```

Seguir o padrão visual abaixo, recalculando todos os valores para o paciente real:

```text
Soro Glicofisiológico – 750 mL EV 12h (21 gts/min).
Ceftriaxona 1 g pó (Reconstituir em 10 mL de AD) - 10 mL EV 24/24h.
Dipirona 500 mg/mL - 0,6 mL EV 6/6h se dor ou febre.
Ondansetrona 2 mg/mL - 1,5 mL EV 8/8h se náuseas ou vômitos.
Simeticona 75 mg/mL gotas - 6 gotas VO 8/8h se gases ou cólica.
```

Os números do exemplo são apenas de formatação. Nunca copiá-los sem recalcular dose, volume, limite máximo, hidratação e gotejamento conforme peso, idade, diagnóstico e apresentação disponível.

## 8. Selecionar exames imediatos

Incluir somente exames necessários para avaliação basal, confirmação diagnóstica, estratificação de gravidade ou segurança do tratamento. Individualizar por faixa etária e síndrome clínica.

Agrupar exames relacionados em uma linha quando necessário para respeitar o limite de 22 linhas. Coletar culturas antes do antimicrobiano quando indicado e quando isso não atrasar terapia urgente.

## 9. Formatar a resposta final

Entregar somente um bloco de código Markdown com identificador `text`.

Regras obrigatórias:

- não inserir título, nome, data, peso, cálculo, justificativa ou referência;
- usar um item por linha, sem marcadores, numeração ou linhas em branco;
- limitar a saída a 22 linhas;
- manter cada medicamento e cada solução em linha própria;
- não usar o bloco-padrão da prescrição adulta;
- usar dose e volume finais calculados;
- posicionar Sinais vitais e HGT após o último medicamento e antes dos exames;
- colocar exames por último;
- não fragmentar a prescrição em mais de uma caixa.

## 10. Revisão final silenciosa

Confirmar antes de responder:

- idade e peso conhecidos;
- dose pediátrica e dose máxima verificadas em fonte confiável;
- conversão correta entre mg, concentração e mL ou gotas;
- diluição e velocidade seguras;
- hidratação e gotejamento recalculados;
- ausência dos itens-padrão adultos;
- ordem obrigatória preservada;
- até 22 linhas e exatamente uma caixa de texto.
