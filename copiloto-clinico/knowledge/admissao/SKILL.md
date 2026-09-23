---
name: admissao
description: Gere admissões hospitalares de pacientes adultos avaliados no pronto atendimento e destinados à enfermaria, recuperando e consolidando dados clínicos e anexos já enviados em qualquer ponto da conversa, com exame físico padronizado, exames complementares estruturados e hipóteses diagnósticas definidas de forma independente. Não use para admissões pediátricas ou de unidade de terapia intensiva.
---

# Admissão hospitalar adulta em enfermaria

Produza uma evolução de admissão pronta para inserção no prontuário. A invocação isolada de `@admissao` ou `$admissao` é suficiente quando os dados já estiverem no chat; não exija que o usuário os copie ou envie novamente.

## Recuperação e consolidação do contexto

- Antes de redigir, revise toda a conversa atual, desde o início, incluindo mensagens do usuário, anexos, imagens, documentos e resultados ou laudos já apresentados no chat.
- Reúna todas as informações pertinentes ao paciente adulto cuja admissão está sendo solicitada, mesmo que tenham sido enviadas em mensagens separadas ou muito antes da invocação.
- Inclua também dados novos escritos junto da invocação e integre-os aos dados anteriores.
- Priorize informações diretamente fornecidas pelo usuário e dados primários dos anexos. Utilize análises anteriores do assistente quando forem claramente referentes ao mesmo paciente e ao mesmo exame, conferindo-as com o anexo sempre que ele estiver acessível.
- Considere a sequência temporal das mensagens. Uma correção, atualização ou substituição explícita enviada posteriormente prevalece sobre o dado anterior correspondente; preserve informações anteriores que não tenham sido modificadas.
- Não misture dados de pacientes diferentes. Se houver vários casos no mesmo chat, use o paciente adulto mais recentemente indicado pelo usuário. Se ainda houver ambiguidade real sobre qual paciente deve ser admitido, faça uma única pergunta objetiva de identificação antes de gerar o documento.
- Não solicite reenvio apenas porque a informação não está na mensagem atual. Peça dado adicional somente quando ele não existir em nenhum ponto acessível da conversa e for indispensável para resolver uma inconsistência material.
- Depois de consolidar o contexto, use exclusivamente esses dados e os padrões de normalidade expressamente definidos nesta habilidade.

## Regras essenciais

- Não invente cronologia, sintomas, negativas, sinais vitais, antecedentes, tratamentos, resultados ou circunstâncias não fornecidas.
- Redija a história da moléstia atual em texto técnico, direto e cronológico, sem título próprio. Preserve datas, horários, procedência e forma de encaminhamento quando informados.
- Não repita no texto final informações contraditórias. Diante de conflito material que impeça uma admissão segura, solicite esclarecimento em vez de escolher arbitrariamente.
- Complete os sistemas não descritos do exame físico com os padrões normais abaixo. Antes de aplicar um padrão, verifique todo o contexto e não use nenhuma afirmação incompatível com achados, sinais vitais ou estado clínico fornecidos.
- Quando houver descrição parcial de um sistema, preserve os achados enviados e complete apenas os elementos não descritos que permaneçam compatíveis com o caso.
- Não transforme ausência de informação na história clínica em uma negativa. Os únicos padrões autorizados fora do exame físico são os de APP, MUCs e alergias definidos abaixo.
- Use linguagem médica padronizada, sem comentários metalinguísticos, justificativas, links ou referências no documento final.

## Antecedentes

Use exatamente estes padrões quando o item inteiro não tiver sido informado:

- `# APP: Nega doenças crônicas.`
- `# MUCs: Nega medicações de uso contínuo.`
- `# Alergias: Nega alergias.`

Quando houver informação, registre somente o conteúdo fornecido. Não complete uma lista parcial com negativas não declaradas.

## Exame físico

Use os seguintes textos apenas para sistemas sem dados e sem incompatibilidade clínica:

- **Geral:** Paciente em bom estado geral, consciente, cooperativo, hidratado, corado, afebril, eupneico, sem sinais de toxemia ou instabilidade clínica. Mucosas normocoradas, sem cianose ou icterícia.
- **Neurológico:** Consciente, orientado em tempo, espaço e pessoa. Linguagem preservada. Sem déficits motores ou sensitivos. Força muscular grau V em quatro membros. Reflexos osteotendinosos presentes e simétricos. Pupilas isocóricas e fotorreagentes. Sem sinais de irritação meníngea.
- **Respiratório:** Eupneico, sem uso de musculatura acessória. Expansibilidade torácica preservada e simétrica. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios. Frequência respiratória dentro da faixa fisiológica.
- **Cardiovascular:** Bulhas cardíacas normofonéticas, ritmo regular em dois tempos, sem sopros, extrassístoles ou ruídos patológicos. Pulsos periféricos palpáveis e simétricos. Perfusão periférica adequada. Enchimento capilar < 2 segundos.
- **Abdome:** Plano, flácido, indolor à palpação superficial e profunda. Sem visceromegalias, massas palpáveis ou sinais de irritação peritoneal. Ruídos hidroaéreos presentes e normoativos.
- **Extremidades:** Sem edemas, sem deformidades, sem lesões cutâneas. Pulsos periféricos presentes e simétricos. Amplitude de movimento preservada. Sem sinais clínicos de trombose venosa profunda.

Não crie valores numéricos para sinais vitais. Caso tenham sido fornecidos, incorpore-os no item Geral de forma concisa.

## Exames complementares

- Omita completamente o bloco `# EXAMES COMPLEMENTARES:` quando nenhum exame tiver sido fornecido em texto ou anexo.
- Leia os anexos disponíveis e extraia somente resultados legíveis. Não presuma valores, datas ou conclusões ilegíveis.
- Apresente cada conjunto de exames laboratoriais em uma única linha, sem unidades, usando a data no formato `DD/MM/AA` e a ordem abaixo:

  `- Laboratório DD/MM/AA: Hb X | Ht X | Leuco X | Plaq X | Na X | K X | Cr X | Ur X | Troponina X | D-dímero X`

- Inclua somente os analitos efetivamente informados, mantendo essa ordem. Se a data não estiver disponível, escreva `- Laboratório [data não informada]:` e não a estime.
- Estruture eletrocardiograma e exames de imagem em itens separados, com o nome do método e achados objetivos: `- ECG: ...`, `- Raio-X de tórax: ...`, `- TC de ...: ...`, `- USG de ...: ...`.
- Não converta uma hipótese de laudo em diagnóstico definitivo. Preserve qualificadores como “sugestivo de”, “compatível com” ou “sem evidência de”, quando presentes.

## Hipóteses diagnósticas

- Defina as hipóteses de forma independente a partir da história, exame físico e exames complementares, usando raciocínio clínico e evidência médica atual.
- Não aceite nem reproduza automaticamente hipóteses ou rótulos enviados pelo usuário. Reavalie-os com base nos dados; uma hipótese pode coincidir com o rótulo recebido somente se estiver sustentada pelo caso.
- Ordene as hipóteses por relevância clínica e compatibilidade com os dados.
- Apresente somente os nomes das hipóteses em itens iniciados por hífen. Não inclua explicações, justificativas, escores, links ou referências.
- Não declare como estabelecido um diagnóstico que permaneça incerto; use qualificação diagnóstica tecnicamente apropriada quando necessário.

## Formato obrigatório da resposta

Entregue somente um bloco de código cercado por três crases e identificado como `markdown`, sem introdução ou conclusão fora dele. Mantenha exatamente esta ordem:

```markdown
[História da moléstia atual em texto direto, sem título]

# APP: [informação ou padrão]
# MUCs: [informação ou padrão]
# Alergias: [informação ou padrão]

# EXAME FÍSICO:
- Geral: [informação ou padrão compatível]
- Neurológico: [informação ou padrão compatível]
- Respiratório: [informação ou padrão compatível]
- Cardiovascular: [informação ou padrão compatível]
- Abdome: [informação ou padrão compatível]
- Extremidades: [informação ou padrão compatível]

# EXAMES COMPLEMENTARES:
- [incluir o bloco inteiro somente quando houver exames]

# HIPÓTESES DIAGNÓSTICAS:
- [hipótese 1]
- [hipótese 2, se aplicável]
```

Não imprima colchetes, instruções ou campos-modelo no documento final.
