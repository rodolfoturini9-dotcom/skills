# Template de evolução diária de UTI

Use este template como mapa de ordem e apresentação. Os tokens entre colchetes são instruções internas: nunca os reproduza na resposta. Aplique as regras de omissão do `SKILL.md` a cada segmento, linha, item, subseção e seção.

```markdown
# Paciente: [DADO] | Leito: [DADO]
DIH: [DADO] | DI-UTI: [DADO]

# DIAGNÓSTICOS ATUAIS:
- [LISTA-INFO]

# DIAGNÓSTICOS RESOLVIDOS:
- [LISTA-INFO]

# ANTECEDENTES:
- Comorbidades: [LISTA-INFO]
- Alergias: [LISTA-INFO]
- MUCs: [LISTA-INFO]

# RESUMO DA INTERNAÇÃO / HPMA:
[INFO]

# EVENTOS DAS ÚLTIMAS 24 HORAS:
- [LISTA-INFO]

# CONTROLES – ÚLTIMAS 24 HORAS:
- PA: [DADO]–[DADO] mmHg | PAM: [DADO]–[DADO] mmHg
- FC: [DADO]–[DADO] bpm
- FR: [DADO]–[DADO] irpm
- SpO₂: [DADO]–[DADO]%
- Temperatura: [DADO]–[DADO] °C
- Glicemia capilar: [DADO]–[DADO] mg/dL
- Entradas: [DADO] mL/24 h | Saídas: [DADO] mL/24 h
- Diurese: [DADO] mL/24 h | [DADO] mL/kg/h
- Evacuações: [INFO]
- Balanço hídrico: [DADO] mL/24 h

# SUPORTES ATUAIS:
- Respiratório: [INFO]
- Hemodinâmico: [INFO]
- Sedoanalgesia: [INFO]
- Bloqueio neuromuscular: [INFO]
- Hemodiálise: [INFO]
- Nutrição: [INFO]

# VENTILAÇÃO MECÂNICA:
- Via aérea: [INFO] | calibre: [INFO] | fixação: [INFO] cm
- Modo: [INFO] | FiO₂: [INFO]% | PEEP: [INFO] cmH₂O
- VC: [INFO] mL | [INFO] mL/kg
- FR programada: [INFO] irpm | FR total: [INFO] irpm
- Pressão de pico: [INFO] cmH₂O | Pressão de platô: [INFO] cmH₂O
- Driving pressure: [INFO] cmH₂O | Complacência: [INFO] mL/cmH₂O
- Relação PaO₂/FiO₂: [INFO]
- Sincronia: [INFO]
- Pronação: [INFO]

# DISPOSITIVOS:
- [LISTA-INFO]

# INFUSÕES CONTÍNUAS:
- [LISTA-INFO]

# ANTIMICROBIANOS:
- Atual: [INFO] – início [INFO] – D[INFO]
- Culturas/microbiologia: [LISTA-INFO]

# PROFILAXIAS:
- TEV: [INFO]
- Úlcera de estresse: [INFO]
- Prevenção de lesão por pressão: [INFO]

# EXAME FÍSICO:
- Geral: [INFO]
- Neurológico: [INFO]
- Respiratório: [INFO]
- Cardiovascular: [INFO]
- Abdome: [INFO]
- Extremidades: [INFO]
- Pele: [INFO]

# EXAMES COMPLEMENTARES:

## Laboratoriais:
- [LISTA-INFO]

## Gasometria:
- [LISTA-INFO]

## Microbiologia:
- [LISTA-INFO]

## Imagem:
- [LISTA-INFO]

# AVALIAÇÃO POR SISTEMAS / PROBLEMAS:
1. NEUROLÓGICO: [INFO]
2. RESPIRATÓRIO: [INFO]
3. CARDIOVASCULAR/HEMODINÂMICO: [INFO]
4. RENAL/HIDROELETROLÍTICO: [INFO]
5. GASTROINTESTINAL/NUTRICIONAL: [INFO]
6. INFECCIOSO: [INFO]
7. HEMATOLÓGICO: [INFO]
8. ENDOCRINOMETABÓLICO: [INFO]
9. PELE/MUSCULOESQUELÉTICO: [INFO]

# IMPRESSÃO CLÍNICA:
[INFO]

# CONDUTAS:
- Neurológico: [INFO]
- Respiratório: [INFO]
- Hemodinâmico: [INFO]
- Renal/hidroeletrolítico: [INFO]
- Infeccioso: [INFO]
- Hematológico: [INFO]
- Gastrointestinal/nutricional: [INFO]
- Endocrinometabólico: [INFO]
- Profilaxias: [INFO]
- Dispositivos: [INFO]
- Mobilização/reabilitação: [INFO]
- Exames/monitorização: [INFO]
- Interconsultas: [INFO]

# METAS PARA AS PRÓXIMAS 24 HORAS:
- [INFO]

# PLANEJAMENTO / PROGNÓSTICO:
- Permanência em UTI: [INFO]
- Limitações terapêuticas: [INFO]
- Prognóstico: [INFO]
- Previsão de transferência/alta da UTI: [INFO]

# COMUNICAÇÃO:
- Família atualizada em [INFO]
- Interlocutor: [INFO]
- Informações fornecidas: [INFO]
- Decisões compartilhadas/consentimentos: [INFO]

# PENDÊNCIAS:
- [LISTA-INFO]
```

## Semântica dos tokens

- `[DADO]`: valor textual ou numérico explícito na fonte.
- `[INFO]`: conteúdo único ou narrativo explícito; omitir o item quando ausente.
- `[LISTA-INFO]`: um ou mais itens explícitos; omitir o bloco quando a lista estiver vazia.
- Uma seção só permanece se houver conteúdo válido em pelo menos um de seus descendentes.
