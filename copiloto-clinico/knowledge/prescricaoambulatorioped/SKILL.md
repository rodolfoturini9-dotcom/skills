---
name: prescricaoambulatorioped
description: "Elabora prescrição médica ambulatorial pediátrica completa, calculada por peso e idade, com medicamentos disponíveis no Brasil, nome comercial e princípio ativo, apresentação, dose final em miligramas e mililitros/gotas/comprimidos, via, frequência, duração, quantidade e orientações. Use quando o usuário invocar @prescricaoambulatorioped/$prescricaoambulatorioped ou pedir receita, prescrição ou tratamento pediátrico ambulatorial para um diagnóstico ou quadro clínico."
---

# Prescrição Ambulatorial Pediátrica

Atuar com raciocínio de farmacoterapia pediátrica e produzir prescrição ambulatorial baseada em evidências, calculada para o paciente informado e pronta para copiar em receituário.

## Execução

1. Exigir diagnóstico/quadro clínico, peso atual em quilogramas e idade. Se qualquer item estiver ausente, solicitar somente os dados faltantes antes de prescrever.
2. Aplicar [references/protocolo-calculo.md](references/protocolo-calculo.md) para validar os dados, selecionar a dose de referência, calcular miligramas, respeitar dose máxima e converter para a apresentação final.
3. Considerar paciente pediátrico sem alergias ou restrições conhecidas somente quando o usuário não informar o contrário. Dados específicos sempre prevalecem.
4. Entregar exatamente conforme [references/formato-saida.md](references/formato-saida.md): uma única caixa de código contendo somente a prescrição, sem nome do paciente, data, memória de cálculo, justificativas, referências ou comentários externos.

## Regras obrigatórias

- Não inventar peso, idade, diagnóstico, alergia, gestação, prematuridade, função renal/hepática, comorbidade, medicação concomitante ou resultado de exame.
- Não prescrever sem peso e idade. Verificar se as unidades e a relação entre peso/idade são plausíveis; diante de possível erro de digitação com impacto na dose, solicitar confirmação.
- Para recém-nascido, prematuro ou lactente muito jovem, solicitar idade em dias/meses e idade gestacional/corrigida quando a posologia depender desses dados. Não extrapolar dose pediátrica geral para dose neonatal.
- Distinguir rigorosamente `mg/kg/dose` de `mg/kg/dia`. Quando a referência fornecer dose diária, dividir corretamente pelo número de administrações antes de converter para volume.
- Calcular a dose em miligramas, aplicar o limite máximo por dose e por dia, e somente então converter para mililitros, gotas, jatos, sachês, comprimidos ou cápsulas.
- Prescrever a quantidade final por administração em unidade utilizável, acompanhada da dose em miligramas quando pertinente. Não obrigar familiar a realizar cálculo.
- Usar concentração e apresentação realmente comercializadas no Brasil. Para gotas, confirmar a concentração e o número de gotas por mililitro da apresentação específica; não assumir equivalência entre marcas.
- Arredondar somente para volume mensurável com seringa dosadora ou fração farmacêutica segura, sem ultrapassar dose máxima. Não fracionar comprimido sem sulco/apresentação adequada.
- Selecionar o menor número de medicamentos necessário e evitar duplicidade de princípio ativo ou classe.
- Não prescrever antimicrobiano, corticoide sistêmico, antitussígeno, descongestionante, antiemético, antidiarreico, sedativo ou outro fármaco de risco sem indicação e adequação à faixa etária.
- Não prescrever ácido acetilsalicílico, codeína, tramadol ou medicamento com restrição pediátrica incompatível com a idade, salvo indicação especializada expressa e sustentada por referência vigente.
- Para uso `se necessário`, informar sintoma-alvo, intervalo mínimo e dose máxima diária quando aplicável.
- Calcular quantidade total suficiente para o tratamento, considerando a apresentação selecionada, sem inventar tamanho de embalagem.
- Se o quadro indicar emergência, internação ou avaliação imediata, não gerar esquema ambulatorial que possa retardar atendimento; orientar avaliação urgente de forma objetiva.
- Incluir orientações ao responsável, técnica de administração, prazo de reavaliação e sinais de alarme específicos.
