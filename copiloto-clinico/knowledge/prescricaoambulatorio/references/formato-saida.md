# Formato obrigatório

Entregar uma única caixa de código Markdown e nenhum texto antes ou depois. Não incluir nome do paciente, data, diagnóstico, assinatura, conselho profissional, justificativas ou referências.

Dentro da caixa, usar somente as seções necessárias. Para cada medicamento:

1. Primeira linha: nome comercial, princípio ativo, concentração, forma/apresentação e quantidade.
2. Segunda linha: dose, via, frequência e duração. Para uso eventual, incluir indicação, intervalo mínimo e máximo diário quando aplicável.
3. Inserir uma linha em branco antes do próximo medicamento.

Modelo:

```markdown
USO ORAL

1. [Nome comercial] ([princípio ativo]) [concentração] — [forma farmacêutica]. Quantidade: [total].
Tomar [dose] por via oral a cada [intervalo]/[frequência], por [duração].

2. [Nome comercial] ([princípio ativo]) [concentração] — [forma farmacêutica]. Quantidade: [total].
Tomar [dose] por via oral se [sintoma], respeitando intervalo mínimo de [intervalo] e máximo de [dose diária], por até [duração].

USO TÓPICO/INALATÓRIO/NASAL/OUTRO

3. [Nome comercial] ([princípio ativo]) [concentração] — [apresentação]. Quantidade: [total].
Aplicar/inalar/administrar [dose] por via [via] [frequência], por [duração].

ORIENTAÇÕES

- [Medida não farmacológica pertinente].
- [Orientação de administração ou segurança].
- Reavaliar em [prazo objetivo] se não houver melhora clínica.
- Procurar atendimento imediatamente em caso de [sinais de alarme específicos].
```

Regras de redação:

- Remover seções sem medicamentos.
- Não usar abreviações ambíguas como `VO`, `SOS`, `ACM` ou `CP`; escrever por extenso.
- Não usar `1 caixa` quando o número exato de comprimidos, cápsulas, sachês, frascos ou doses puder ser calculado.
- Manter nomes de princípios ativos em português segundo denominação brasileira.
- Não apresentar alternativas com `ou`; escolher um esquema principal.
- Não repetir o diagnóstico ou explicar por que cada medicamento foi escolhido.
