# Template de admissão pediátrica

Usar este template sempre que a habilidade for invocada. Substituir todos os campos-modelo antes da entrega.

## Padrões autorizados

Quando o item inteiro não tiver sido informado, usar exatamente:

- APP: `Nega doenças crônicas.`
- MUCs: `Nega medicações de uso contínuo.`
- Alergias: `Nega alergias.`

Para um sistema do exame físico sem qualquer dado, usar integralmente e sem resumir o padrão correspondente abaixo. Sintomas históricos, sem achado atual de exame físico ou sinal vital documentado, não substituem esse padrão. Modificar apenas o trecho diretamente incompatível quando houver achado atual explícito:

- **Geral:** Paciente pediátrico em bom estado geral, ativo, responsivo, hidratado, corado, afebril, sem sinais de toxemia. Mucosas normocoradas. Comportamento, interação e responsividade compatíveis com a idade.
- **Neurológico:** Criança alerta, responsiva a estímulos, interação adequada para a faixa etária. Tônus preservado, força muscular compatível com a idade. Reflexos presentes e simétricos. Pupilas isocóricas e fotorreagentes. Sem sinais de irritação meníngea.
- **Respiratório:** Eupneico, sem batimento de asa nasal, sem tiragem, sem retrações, sem uso de musculatura acessória. Expansibilidade torácica preservada e simétrica. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios. Frequência respiratória dentro da faixa fisiológica para a idade.
- **Cardiovascular:** Bulhas cardíacas normofonéticas, ritmo regular, sem sopros. Pulsos periféricos palpáveis e simétricos. Perfusão periférica adequada. Enchimento capilar < 2 segundos.
- **Abdome:** Plano, flácido, indolor à palpação superficial e profunda. Sem visceromegalias, sem massas palpáveis. Ruídos hidroaéreos presentes e normoativos.
- **Extremidades:** Sem edemas, sem deformidades, sem lesões cutâneas. Mobilidade preservada. Pulsos periféricos presentes e simétricos. Sem sinais clínicos de trombose venosa profunda.

## Estrutura obrigatória

```markdown
[História da moléstia atual em texto direto, sem título]

# APP: [informação ou padrão autorizado]
# MUCs: [informação ou padrão autorizado]
# Alergias: [informação ou padrão autorizado]

# EXAME FÍSICO:
- Geral: [informação ou padrão compatível]
- Neurológico: [informação ou padrão compatível]
- Respiratório: [informação ou padrão compatível]
- Cardiovascular: [informação ou padrão compatível]
- Abdome: [informação ou padrão compatível]
- Extremidades: [informação ou padrão compatível]

# EXAMES COMPLEMENTARES:
- Laboratório DD/MM/AA: Hb X | Ht X | Leuco X | Plaq X | Na X | K X | Cr X | Ur X | PCR X | Procalcitonina X | [outros exames efetivamente informados]
- [ECG ou exame de imagem, se enviado]

# HIPÓTESES DIAGNÓSTICAS:
- [hipótese 1]
- [hipótese 2, se clinicamente sustentada]
```

Omitir o bloco `# EXAMES COMPLEMENTARES:` inteiro quando nenhum exame tiver sido enviado. Não omitir os demais blocos.
