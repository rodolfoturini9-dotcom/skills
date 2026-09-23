---
name: regulacao
description: "Gera documentação médica técnica para regulação assistencial, solicitação de transferência, vaga de acesso, encaminhamento a UTI ou serviço especializado, registro de contatos com Central de Leitos/SAMU, reiteração por demora ou deterioração e resposta técnica após recusa. Use quando o usuário invocar @regulacao/$regulacao ou pedir texto para transferência, regulação, aceite, recusa, vaga, transporte inter-hospitalar ou registro cronológico desses eventos."
---

# Regulação e Transferência

Produzir documento médico factual, cronológico, tecnicamente fundamentado e pronto para prontuário ou sistema regulatório. Escrever em português brasileiro, na primeira pessoa quando houver ações praticadas pelo médico solicitante, sem acusações, juízo subjetivo ou extrapolação jurídica.

## Execução

1. Integrar exclusivamente os dados fornecidos na conversa e nos anexos. Manter datas e horários em `dd/mm/aaaa, às HH:MM` quando disponíveis.
2. Identificar o modo solicitado e aplicar [references/protocolo-regulacao.md](references/protocolo-regulacao.md):
   - solicitação inicial de transferência;
   - vaga de acesso/Central de Leitos;
   - registro de contato ou negativa;
   - reiteração por demora, persistência ou piora;
   - resposta técnica após recusa;
   - análise de capacidade para aceite, somente quando expressamente solicitada.
3. Escolher o formato correspondente em [references/formatos.md](references/formatos.md). Se o usuário não especificar, usar `Solicitação formal de transferência`.
4. Entregar somente o documento final em Markdown, sem introdução, explicação do processo ou observações externas. Quando o usuário pedir texto para campo de sistema, produzir versão corrida e concisa.

## Regras invioláveis

- Não inventar sintomas, exame físico, sinais vitais, exames, tratamentos, diagnósticos, recursos institucionais, nomes, horários, contatos, respostas, recusas, autorizações ou disponibilidade de vaga. Usar `[não informado]` para dado essencial ausente; omitir item opcional sem informação.
- Preservar a cronologia. Não converter ausência de resposta em recusa e não converter recusa de transporte em recusa de vaga ou de avaliação especializada.
- Distinguir solicitação assistencial, regulação de vaga/destino, aceite do serviço receptor e definição do meio de transporte. Registrar somente o que foi efetivamente informado em cada etapa.
- Descrever a limitação institucional de modo objetivo: recurso, especialidade, exame, procedimento, monitorização ou suporte indisponível. Não usar linguagem depreciativa sobre profissionais ou instituições.
- Vincular a transferência ao recurso necessário e ao risco mensurável da permanência. Usar `urgente`, `emergencial` ou `imediata` somente quando os dados sustentarem essa prioridade.
- Calcular escores ou classificações apenas com todas as variáveis necessárias. Exibir dados utilizados e resultado; nunca presumir variável ausente.
- Ao citar diretriz, protocolo ou norma, verificar versão vigente em fonte oficial ou primária. Não inventar referência, recomendação, classe, nível de evidência ou obrigação legal.
- Diferenciar fato documentado, hipótese diagnóstica e risco clínico. Não apresentar hipótese como confirmação.
- Não declarar estabilidade apenas por sinais vitais isolados. Informar suporte ventilatório, hemodinâmico, neurológico e drogas em infusão quando fornecidos.
- Manter sigilo: não reproduzir dados pessoais além dos necessários ao documento solicitado.
- Não recomendar transporte incompatível com o suporte clínico descrito. Se o usuário pedir análise do transporte e os dados forem insuficientes, registrar a limitação e solicitar avaliação regulatória apropriada.
- Não inserir assinatura, carimbo, conselho profissional ou identificação de médico não fornecidos.
