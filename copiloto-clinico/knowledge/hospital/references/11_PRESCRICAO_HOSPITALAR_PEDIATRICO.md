# MODELO DE PRESCRIÇÃO HOSPITALAR — PEDIÁTRICA

### Objetivo

Fornecer um modelo para elaboração de prescrições hospitalares pediátricas em enfermaria, observação ou pronto atendimento hospitalar. A prescrição deve ser segura, objetiva, padronizada e pronta para prontuário, com cálculo de dose já convertido para a forma final de administração.

---

# REGRAS DE PREENCHIMENTO (IA – OBRIGATÓRIO)

- Gerar UMA PRESCRIÇÃO FINAL.
- NÃO inventar dados.
- NÃO inferir peso ou idade.
- NÃO gerar dose pediátrica sem:
  - peso;
  - idade;
  - apresentação da medicação.
- NÃO adicionar medicações desnecessárias.
- NÃO utilizar linguagem explicativa.
- Utilizar um item por linha.
- Cada linha deve terminar com ponto final.
- A dose deve ser gerada já na forma final de uso:
  - mL;
  - gotas;
  - comprimidos;
  - puffs;
  - UI;
  - ampola;
  - sachê.
- Respeitar dose máxima pediátrica.
- Ajustar conforme:
  - idade;
  - peso;
  - função renal;
  - alergias;
  - comorbidades.

---

# FORMATO OBRIGATÓRIO

[Medicamento e apresentação] - [dose final de uso] [via] [frequência].

---

# EXEMPLOS

Dipirona 500 mg/mL - 0,6 mL IV 6/6h se dor ou febre.

Paracetamol 200 mg/mL - 1,5 mL VO 6/6h se febre.

Ondansetrona 4 mg/5 mL - 2,5 mL VO 8/8h se náuseas ou vômitos.

Amoxicilina 250 mg/5 mL - 5 mL VO 8/8h por 7 dias.

Prednisolona 3 mg/mL - 4 mL VO 1x/dia por 5 dias.

Salbutamol spray 100 mcg/puff - 2 puffs IN 4/4h se broncoespasmo.

SF 0,9% - 250 mL IV correr em 6h.

---

# MEDICAÇÕES QUE PODEM SER CONSIDERADAS

## Tratamento Principal
- antibióticos;
- antivirais;
- broncodilatadores;
- corticoides;
- hidratação;
- anticonvulsivantes;
- insulinoterapia;
- analgesia.

## Sintomáticos
- antitérmicos;
- antieméticos;
- analgésicos;
- antialérgicos;
- lavagem nasal;
- nebulização.

---

# OBSERVAÇÕES

- Sempre calcular dose por peso.
- Sempre converter para apresentação final.
- Sempre respeitar dose máxima.
- Evitar antibióticos sem indicação.
- Evitar corticoides desnecessários.
- Evitar medicações contraindicadas para faixa etária.
- Linguagem sempre técnica e institucional.
- Prescrição deve estar pronta para prontuário.

---

# REGRAS INTERNAS PARA IA

- Não adicionar explicações extras.
- Não justificar medicações.
- Não explicar cálculos.
- Não adicionar seções extras.
- Saída deve conter apenas a prescrição final.