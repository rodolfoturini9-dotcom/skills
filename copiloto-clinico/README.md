# Copiloto Clínico Multiagente — versão 3 (API Claude)

Copiloto em português com 14 especialistas, cada um definido por um `SKILL.md` e suas `references/` (57 arquivos em `knowledge/`, íntegros conforme `knowledge/MANIFEST.json`). Os especialistas usam a API Claude da Anthropic. A chave é informada na própria interface, em **Configurações**.

## Duas formas de uso

| | Arquivo único (`dist/copiloto_clinico.html`) | Servidor local (FastAPI) |
|---|---|---|
| Instalação | Nenhuma: abrir o arquivo no navegador (computador, tablet ou celular) | Python 3.11+ |
| Chave da API | Campo em Configurações; vai do navegador direto para a Anthropic | Campo em Configurações (repassado a cada solicitação) ou `ANTHROPIC_API_KEY` no servidor |
| Consulta FHIR de prescrições | Não disponível | Disponível (`FHIR_BASE_URL`, `FHIR_BEARER_TOKEN`) |
| Token de acesso (`COPILOT_ACCESS_TOKEN`) | Não se aplica | Disponível |
| Internet | Necessária (API e carregamento do SDK via jsDelivr) | Necessária para a API |

### Arquivo único

1. Abra `dist/copiloto_clinico.html`.
2. Em **Configurações**, cole a chave criada em https://console.anthropic.com/ (API Keys) e clique em **Testar chave**.
3. Opcional: marque **Salvar neste dispositivo**, crie uma senha (mínimo 8 caracteres) e clique em **Salvar protegida**. A chave é gravada criptografada (PBKDF2-SHA-256 com 310.000 iterações e AES-GCM de 256 bits). A senha não é gravada. Ao reabrir o arquivo, digite a senha em **Desbloquear**. Após 30 minutos sem uso, o copiloto bloqueia sozinho. **Bloquear** tira a chave da memória na hora, e **Apagar chave** remove a cópia salva do dispositivo. Sem essa opção, a chave fica só na memória da aba e some quando a aba é fechada.

Após alterar `knowledge/` ou `web/index.html`, regenere o arquivo com `python scripts/build_standalone.py`.

### Servidor local

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Abra http://127.0.0.1:8000/ e informe a chave em Configurações. A chave digitada tem prioridade sobre `ANTHROPIC_API_KEY`. O servidor não grava a chave nem a conversa. Documentação da API: http://127.0.0.1:8000/api/docs.

Docker: `cp .env.example .env`, edite e rode `docker compose up --build -d` (porta vinculada a `127.0.0.1:8000`).

## Configurações da interface

- **Modelo**: Claude Opus 5 (padrão), Claude Fable 5.1 (máxima capacidade, maior custo), Claude Sonnet 5 (mais rápido e econômico) e Claude Haiku 4.5 (tarefas simples). O padrão do servidor pode ser alterado por `ANTHROPIC_MODEL`.
- **Esforço de raciocínio**: de baixo a máximo. Alto é o padrão. Esforço maior aumenta o tempo e o custo da resposta.
- **Busca web**: permite ao especialista verificar diretriz, dose ou protocolo atual, como os SKILL.md de prescrição exigem. É cobrada por busca e precisa estar habilitada na organização do Console. As fontes consultadas aparecem abaixo da resposta.
- **Padrões de normalidade**: vem desligado. Desligado, nada é completado: itens sem dado são omitidos ou marcados `[não informado]`. Ligado, aplica os textos-padrão de exame físico e os "Nega…" de APP/MUCs/alergias definidos nos SKILL.md de admissão e maternidade, e a interface mostra um aviso de conferência.

## Arquitetura

1. **Roteamento** (`app/router.py`): regras determinísticas e auditáveis, comandos `@ecg`, `/admissaoped` etc., ou seleção manual. Complementos curtos continuam no especialista anterior.
2. **Conhecimento** (`app/rag.py`): o `SKILL.md` e todas as referências do especialista vão integralmente ao prompt de sistema, com cache de 1 hora. Isso substitui a recuperação aproximada da versão 2 como fonte principal. A recuperação lexical local continua em uso para exibir trechos rastreáveis na resposta e para a ferramenta `consultar_referencias` (módulo relacionado, por exemplo `admissao` → `hospital`).
3. **Especialista** (`app/agents.py`): chamada à API com raciocínio adaptativo, `fallbacks: "default"` (Opus 5 e Fable 5.1; em caso de recusa por classificador de segurança, a própria API repete a solicitação em modelo alternativo), laço de ferramentas e tratamento de `pause_turn`, `max_tokens` e `refusal`.
4. **Ferramentas**: `calcular_dose_volume`, `calcular_manutencao_hidrica` e `calcular_gotejamento` executam o script original `scripts/calcular_pediatria.py` (a versão de arquivo único usa porte equivalente em JavaScript). Também estão disponíveis `consultar_referencias` e a busca web (`web_search`).
5. **Anexos**: PNG, JPEG, WEBP e PDF de até 8 MB. O PDF é enviado nativamente, com texto e imagem de cada página.
6. **Histórico**: últimos 12 turnos de texto, com até 12.000 caracteres cada. Anexos de turnos anteriores não são reenviados.

Endpoints: `POST /api/chat`, `POST /api/key/check`, `GET /api/health`, `GET /api/modules`, `GET /api/models` e `POST /api/tools/pediatrics`. Esse último aceita `dose-volume` (`weight_kg`, `dose_mg_kg`, `concentration_mg_ml` e, opcionalmente, `max_dose_mg`), `maintenance` (`weight_kg`) e `drip` (`volume_ml`, `hours` e, opcionalmente, `drop_factor`).

## Validação

`pip install pytest && python -m pytest -q` cobre:

- roteamento, incluindo a faixa etária;
- conhecimento integral por módulo e rastreabilidade;
- calculadora;
- chave por cabeçalho e opções da interface;
- token de acesso e continuidade da conversa;
- filtragem FHIR e PDF nativo;
- tradução de erros da API sem expor a chave;
- laço de ferramentas com cliente simulado (cache, `fallbacks`, raciocínio e resultado da ferramenta);
- perfil do Haiku;
- geração do arquivo único.

`python scripts/verify_knowledge.py` confere o SHA-256 das referências.

Esses testes **não equivalem** a validação clínica de doses, condutas, desempenho multimodal ou segurança do paciente. Antes de uso institucional, é preciso:

- homologar os protocolos;
- testar com casos representativos;
- implantar autenticação, auditoria, contrato com o provedor e adequação à LGPD.

## Limites

- Todo texto é rascunho para revisão e assinatura do médico responsável. O especialista não prescreve de forma autônoma.
- Os dados enviados são processados pela API da Anthropic. Não exponha o servidor em `0.0.0.0` nem publique o arquivo único com chave salva.
- As referências são material do usuário e não foram atualizadas clinicamente nesta versão. `knowledge/uti/references/base_medicamentos.jsonl` contém grafias irregulares herdadas da origem (ex.: `DIPIRONA 10 00MG/ 2ML`).
- ECG por imagem requer traçado legível e interpretação humana.
