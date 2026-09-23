# Formatos de saída

Selecionar o formato conforme a intenção do usuário. Omitir seções opcionais vazias. Manter `[não informado]` apenas nos dados essenciais cuja ausência precise ficar explícita.

## Solicitação formal de transferência

```markdown
# SOLICITAÇÃO DE TRANSFERÊNCIA INTER-HOSPITALAR

## IDENTIFICAÇÃO
- **Paciente:** [nome/iniciais]
- **Idade:** [idade]
- **Sexo:** [sexo]
- **Instituição solicitante:** [instituição]
- **Data e horário da solicitação:** [data/hora]

## DIAGNÓSTICOS E HIPÓTESES
- [diagnóstico confirmado]
- [hipótese diagnóstica identificada como hipótese]

## RESUMO CLÍNICO E CRONOLOGIA
[narrativa objetiva, datada e ordenada]

## ESTADO CLÍNICO ATUAL
- **Neurológico:** [dados]
- **Hemodinâmico:** [dados]
- **Respiratório:** [dados]
- **Sinais vitais:** [dados]
- **Suportes em uso:** [dados]

## EXAMES RELEVANTES
- **[data/hora]:** [exames e achados essenciais]

## TRATAMENTO REALIZADO E RESPOSTA
- [conduta, horário e resposta]

## RECURSO NECESSÁRIO E LIMITAÇÃO INSTITUCIONAL
[recurso/especialidade/procedimento necessário e o que não está disponível localmente]

## JUSTIFICATIVA DA TRANSFERÊNCIA
[relação entre achados, risco, recurso necessário, indisponibilidade e prioridade]

## SOLICITAÇÃO
Solicito transferência [prioridade sustentada pelos dados] para [destino/recurso], com manutenção do suporte necessário durante a remoção e definição do meio de transporte pela regulação conforme o estado clínico atual.

## REGISTROS DE CONTATO
- **[data], às [hora]:** [contato, interlocutor, conteúdo e resposta].
```

## Texto conciso para Central de Leitos/vaga de acesso

```markdown
Paciente [identificação], [idade/sexo], em atendimento desde [data/hora], com [diagnóstico/hipótese]. Apresenta atualmente [estado clínico e dados objetivos]. Exames relevantes: [síntese]. Foram realizados [tratamentos], com [resposta]. Necessita de [recurso/procedimento/especialidade], indisponível nesta instituição, devido a [risco objetivo]. Solicito transferência [prioridade] para serviço de referência com disponibilidade do recurso necessário. [Situação de vaga/aceite/transporte, somente se informada].
```

## Evolução de contato regulatório

```markdown
# EVOLUÇÃO MÉDICA — REGISTRO DE CONTATO REGULATÓRIO

**[data], às [hora]:** Entro em contato por [canal] com [nome e função], da [instituição/serviço], para [objetivo]. Informo [síntese dos dados transmitidos]. Recebo como resposta/orientação: [conteúdo fiel]. Ao término do contato, a solicitação permanece [situação objetiva].
```

Se não houver resposta:

```markdown
**[data], às [hora]:** Realizo contato por [canal] com [serviço] para solicitar [objetivo], encaminhando [dados transmitidos]. Até [hora-limite informada], não houve retorno. Paciente permanece [estado atual e suporte]. Mantenho a solicitação ativa e reitero a necessidade de [recurso/destino].
```

## Reiteração de transferência

```markdown
# REITERAÇÃO DE SOLICITAÇÃO DE TRANSFERÊNCIA

Reitero, em [data/hora], a solicitação de transferência iniciada em [data/hora inicial], em razão de [persistência/progressão/novo risco]. Desde o pedido inicial, o paciente evoluiu com [alterações objetivas], mantendo necessidade de [recurso]. Foram realizadas [novas medidas], com [resposta]. Esta instituição permanece sem [recurso indisponível]. Considerando [dados de gravidade e risco], solicito reavaliação regulatória e transferência [prioridade] para serviço com capacidade de [recurso requerido].
```

## Resposta técnica após recusa

```markdown
# REAVALIAÇÃO TÉCNICA APÓS RESPOSTA REGULATÓRIA

**Resposta recebida em [data/hora]:** [descrição factual da resposta e interlocutor].

Após reavaliação, o paciente apresenta [estado atual e achados objetivos]. Persiste a necessidade de [recurso] porque [justificativa clínica]. A instituição solicitante não dispõe de [limitação]. O risco da permanência sem o recurso inclui [risco sustentado pelos dados]. Diante disso, solicito nova avaliação do caso e manutenção da busca por serviço de referência compatível.
```

## Análise de capacidade para aceite

```markdown
# ANÁLISE TÉCNICA PARA ACEITE/TRANSFERÊNCIA

## NECESSIDADES ASSISTENCIAIS DO PACIENTE
- [suporte, procedimento, especialidade e monitorização]

## RECURSOS INSTITUCIONAIS INFORMADOS
- **Disponíveis:** [dados]
- **Indisponíveis:** [dados]

## DADOS ESSENCIAIS PENDENTES
- [dados que impedem conclusão segura]

## AVALIAÇÃO
[compatibilidade entre necessidade e capacidade, riscos e condições mínimas]

## CONCLUSÃO
[aceite possível, aceite condicionado ou impossibilidade técnica, sempre fundamentado nos recursos informados]
```
