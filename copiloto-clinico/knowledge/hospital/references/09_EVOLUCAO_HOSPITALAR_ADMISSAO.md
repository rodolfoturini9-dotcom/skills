# MODELO DE EVOLUÇÃO/ADMISSÃO HOSPITALAR — PRONTO PARA PREENCHIMENTO RÁPIDO

Este modelo serve como guia para gerar uma evolução de admissão hospitalar final, pronta para prontuário, seguindo uma estrutura fixa. As regras abaixo devem ser observadas para garantir preenchimento rápido e documentação adequada durante os plantões.

## REGRAS DE PREENCHIMENTO (IA – OBRIGATÓRIO)

- Gerar UMA EVOLUÇÃO FINAL, pronta para prontuário.
- Seguir estrutura fixa.
- NÃO inventar dados.
- NÃO inferir informações ausentes.
- NÃO sugerir conduta.
- NÃO interpretar exames.
- Itens não informados → OMITIR, exceto:
  - Exame físico → manter padrão normal.
  - SSVV:
    - Se nenhum informado → OMITIR linha inteira.
    - Se parcial → preencher apenas os disponíveis.

---

# SAÍDA FINAL (FORMATO OBRIGATÓRIO)

[Resumo clínico objetivo em parágrafo único contendo: queixa principal, tempo de evolução (se informado), principais sintomas (febre, aceitação alimentar, diurese, comportamento, etc.), achados relevantes e condição no atendimento.]

# APP: [comorbidades / se ausente: “Nega comorbidades”]

# MUCs: [uso contínuo / se ausente: “Nega uso de medicações contínuas”]

# Alergias: [se informado / se ausente: “Nega alergias”]

# EXAME FÍSICO:
PA: ___ mmHg | FC: ___ bpm | FR: ___ irpm | SatO₂: ___ % | Temp.: ___ °C
[→ OMITIR linha inteira se nenhum sinal vital informado]
- Geral: bom estado geral, ativo/reagente, consciente, hidratado, normocorado, afebril, sem sinais de desconforto respiratório no momento.
- Neurológico: ativo e reativo, sem déficit focal evidente, tônus adequado para idade, pupilas isocóricas e fotorreagentes.
- Respiratório: murmúrio vesicular presente e simétrico, sem ruídos adventícios, sem tiragens.
- Cardiovascular: ritmo regular, bulhas normofonéticas em dois tempos, sem sopros, perfusão periférica preservada, TEC < 2s.
- Abdome: flácido, indolor à palpação, sem distensão, ruídos hidroaéreos presentes.
- Extremidades: bem perfundidas, sem edema, sem cianose.
[- Pele: íntegra, sem lesões, sem exantemas.]
[- ORL: sem alterações descritas.]
[- Geniturinário: sem alterações descritas.]

# Exs Complementares:
[Incluir SOMENTE se houver exames]
- Laboratório DD/MM: Hb X Leuco Y Plq Z Cr A Na B K C ...
[→ manter exatamente formato bruto, sem interpretação]
- Gasometria DD/MM: pH X pCO₂ Y pO₂ Z HCO₃ A CO₂T B BE C SatO₂ D
- Exs. de Imagem: [descrição técnica objetiva OU “Limitação técnica: …”]
- ECG: [descrição técnica objetiva OU limitação]

# HDs:
[Incluir no máximo 2 hipóteses, apenas se sustentadas pelos dados]
- [Hipótese principal]
- [Hipótese secundária]

---

# OBSERVAÇÕES INTERNAS PARA IA

- Não adicionar histórico perinatal, vacinação ou alimentação se não informados.
- Não expandir resumo clínico.
- Não adicionar seções extras.
- Linguagem sempre técnica, objetiva, institucional.
- Saída deve ser única, contínua e pronta para prontuário.