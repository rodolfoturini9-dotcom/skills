# Formatos de passagem de plantão

## UTI completa

```markdown
# PASSAGEM DE PLANTÃO — UTI

## PACIENTE
**[Nome/iniciais], [idade] — Leito [número]**  
**Internação:** [data/motivo]  
**Resumo em uma linha:** [diagnóstico principal, complicação dominante e suporte atual].

## PROBLEMAS ATIVOS
1. **[Problema]:** [estado atual/evolução].
2. **[Problema]:** [estado atual/evolução].

## SITUAÇÃO ATUAL POR SISTEMAS
- **Neurológico:** [dados atuais].
- **Respiratório:** [via aérea/suporte/parâmetros/gasometria].
- **Hemodinâmico:** [dados, ritmo, perfusão, vasoativos].
- **Renal/metabólico:** [diurese, balanço, função renal, eletrólitos].
- **Infeccioso:** [foco, febre, culturas, antimicrobianos].
- **Gastrointestinal/nutricional:** [dieta, via, tolerância, drenos].
- **Hematológico:** [hemograma, sangramento, profilaxia/anticoagulação].
- **Pele/mobilidade:** [dados relevantes].

## ÚLTIMAS 24 HORAS
- **[data/hora]:** [evento e repercussão].

## INFUSÕES E TERAPIAS CRÍTICAS
- [fármaco, dose/velocidade, via e tendência].

## DISPOSITIVOS
- [tipo, localização, data de inserção e situação].

## EXAMES E TENDÊNCIAS RELEVANTES
- [exame/tendência e data].

## PENDÊNCIAS
- [pendência, prazo/responsável se informado].

## METAS DO PRÓXIMO TURNO/24 HORAS
- [meta já estabelecida].

## PONTOS DE ATENÇÃO
- [risco ou aspecto que exige vigilância].

## INFORMAÇÕES DE SEGURANÇA
- **Alergias:** [dado].
- **Precauções/isolamento:** [dado].
- **Limitação terapêutica/status de reanimação:** [dado].
```

## Enfermaria

```markdown
# PASSAGEM DE PLANTÃO — ENFERMARIA

**[Nome/iniciais], [idade] — Leito [número]**  
**Motivo da internação:** [motivo].  
**Resumo atual:** [situação clínica em uma ou duas frases].

## PROBLEMAS ATIVOS
- **[Problema]:** [evolução e tratamento atual].

## EVENTOS DO TURNO/ÚLTIMAS 24 HORAS
- [evento com data/hora quando disponível].

## SUPORTE, MEDICAÇÕES E DISPOSITIVOS RELEVANTES
- [dados].

## EXAMES RELEVANTES
- [resultado/tendência].

## PENDÊNCIAS
- [dados].

## PLANO/METAS JÁ DEFINIDOS
- [dados].

## PONTOS DE ATENÇÃO
- [dados].
```

## Pronto atendimento ou observação

```markdown
# PASSAGEM DE PLANTÃO — PA/OBSERVAÇÃO

**[Nome/iniciais], [idade] — Admissão em [data/hora]**  
**Queixa/motivo:** [dados].  
**Hipóteses atuais:** [dados].

## ESTADO ATUAL
[sinais vitais, consciência, suporte e exame direcionado].

## MEDIDAS REALIZADAS E RESPOSTA
- **[horário]:** [medida e resposta].

## EXAMES
- **Concluídos:** [achados relevantes].
- **Pendentes:** [exames aguardados].

## DESTINO/SITUAÇÃO
- [alta, observação, internação, regulação ou avaliação pendente — somente se informado].

## PONTOS PARA O PRÓXIMO TURNO
- [reavaliação, pendência ou risco].
```

## Versão verbal ultracurta

Usar quando o usuário pedir `rápida`, `60 segundos`, `somente o essencial` ou equivalente.

```markdown
**[Paciente/leito]:** [diagnóstico principal e motivo da internação]. Atualmente [estado e suporte]. Nas últimas horas, [evento principal]. Em uso de [terapias críticas]. Pendências: [itens]. Atenção para [risco principal]. Meta do turno: [meta informada].
```

## Múltiplos pacientes

Produzir um bloco independente por paciente, mantendo sempre a mesma ordem:

```markdown
### [LEITO] — [PACIENTE]
- **Resumo:** [diagnóstico + estado atual + suporte].
- **Últimas 24 horas:** [evento principal].
- **Terapias/dispositivos críticos:** [dados].
- **Pendências:** [dados].
- **Meta do turno:** [dados].
- **Atenção:** [risco principal].
```

Nunca criar uma tabela quando o conteúdo clínico exigir frases longas ou quando houver risco de misturar dados entre pacientes.
