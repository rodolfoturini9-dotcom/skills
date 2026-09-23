# Copiloto Clínico Multiagente

Aplicação local em **FastAPI + LangChain + ChromaDB** construída a partir dos 14 `SKILL.md` e 43 arquivos da pasta `references/` enviados pelo usuário. Interface em português, roteador por intenção, um agente por módulo, citações locais e ferramenta determinística de cálculo pediátrico.

## Iniciar

Requer Python 3.11+ e acesso à API do modelo configurado.

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export OPENAI_API_KEY='sua-chave' # Windows PowerShell: $env:OPENAI_API_KEY='sua-chave'
export OPENAI_MODEL='gpt-4.1'    # opcional; use um modelo com suporte a imagem
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Abra http://127.0.0.1:8000/ . Endpoints documentados em http://127.0.0.1:8000/api/docs . O índice é criado automaticamente na primeira inicialização em `data/chroma/`; mantenha a pasta `data/` fora do ZIP e de repositórios. Para testar: `pip install pytest httpx && pytest -q`.

## Fluxo

1. `/api/chat` recebe texto e imagem opcional PNG/JPEG/PDF; PDF é renderizado em até cinco páginas, com limite de 8 MB por arquivo.
2. `app/router.py` seleciona módulo automaticamente por termos específicos ou respeita seleção manual e comandos `@ecg`, `/admissaoped` etc. Quando houver ambiguidade, escolha o módulo na interface.
3. `app/rag.py` indexa os arquivos `SKILL.md` e `references/` em Chroma local; embeddings hash de palavras e trigramas são determinísticos e não exigem download. Esse método oferece recuperação lexical aproximada, sem equivalência à busca semântica com embeddings treinados. O retorno inclui caminho e posição do trecho.
4. `app/agents.py` instancia separadamente cada agente LangChain com `SKILL.md` completo, regras globais de segurança, ferramenta de consulta ao RAG e três funções pediátricas. O agente pode chamar o script original via subprocesso com argumentos validados e sem shell.
5. A resposta e as fontes pré-recuperadas aparecem no chat. `GET /api/health`, `GET /api/modules` e `POST /api/tools/pediatrics` apoiam integração e auditoria.

## Módulos

`admissao`, `admissaoped`, `ecg`, `evolucaouti`, `passagemplantao`, `prescricaoambulatorio`, `prescricaoambulatorioped`, `prescricaohospitalar`, `prescricaohospitalarped`, `regulacao`, `consultorio`, `hospital`, `uti`, `maternidade`.

## Calculadora

O endpoint `/api/tools/pediatrics` aceita `command: "dose-volume"` com `weight_kg`, `dose_mg_kg`, `concentration_mg_ml` e opcional `max_dose_mg`; `"maintenance"` com `weight_kg`; ou `"drip"` com `volume_ml`, `hours` e opcional `drop_factor`. As doses e concentrações de entrada precisam ser verificadas por um profissional. O script calcula aritmética, não decide indicações ou ajustes clínicos.

## Limites e implantação

Esta versão é para execução local por profissional responsável. Dados da conversa não são guardados no backend nem no navegador após recarregar, porém são enviados ao provedor do modelo configurado. As referências anexadas são conteúdo fornecido pelo usuário e não foram validadas ou atualizadas clinicamente. Não use a aplicação como prescrição autônoma. Para uso institucional ou multiusuário, implementar autenticação institucional, perfis de acesso, consentimento e tratamento de dados, trilha de auditoria, versionamento e aprovação de protocolos, contrato adequado com o provedor, testes clínicos e revisão jurídica/LGPD antes de disponibilizar dados de pacientes. Não exponha `uvicorn` em `0.0.0.0` sem essa infraestrutura. ECG por imagem requer exame legível e interpretação humana.

## Atualização 2.0: conversa, acesso e prontuário

- A interface conserva no navegador somente os últimos oito turnos da conversa atual; **Nova conversa** apaga contexto e seleção do paciente. Mudar o ID técnico do paciente limpa o histórico ativo. Não há persistência clínica no backend.
- Configure `COPILOT_ACCESS_TOKEN` com um segredo aleatório para proteger API e documentação. O navegador solicita o token e o mantém apenas em memória. Esse controle simples é adequado ao uso pessoal local; para acesso público ou multiusuário, substitua por autenticação institucional, TLS e perfis de acesso.
- Ao solicitar medicações registradas, a aplicação consulta automaticamente `MedicationRequest` FHIR R4 **apenas** com ID técnico do paciente confirmado. Habilite com `FHIR_BASE_URL=https://...` e `FHIR_BEARER_TOKEN=...`; sem essas credenciais, o prontuário não pode ser consultado. O servidor filtra localmente resultados de outros pacientes e limita a 50 entradas. A interface permite acionar a busca explicitamente. Nenhuma prescrição é escrita no FHIR.
- A análise de PDF envia até cinco páginas como imagens ao modelo; para ECG, forneça a imagem em resolução legível. O texto das referências possui manifesto SHA-256: `python scripts/verify_knowledge.py`.
- Para recuperação com embeddings treinados, use `RAG_EMBEDDINGS=openai` e `OPENAI_API_KEY`; o índice será construído em diretório separado e haverá cobrança das chamadas de indexação. O padrão `hash` funciona sem chamadas externas para indexar.

### Alternativa por Docker Compose

```bash
cp .env.example .env
# Edite .env e informe OPENAI_API_KEY; adicione as demais opções desejadas.
docker compose up --build -d
```

A porta é vinculada a `127.0.0.1:8000`. O volume `copiloto_data` contém apenas o índice dos protocolos. A imagem Docker e uma chamada real ao provedor de modelo não foram validadas neste ambiente; os fluxos locais foram testados com o modelo substituído por um simulador.

### Estado de validação

`python -m pytest -q` verifica roteamento, rastreabilidade do RAG, calculadora, autenticação, continuidade da conversa e filtragem FHIR. Isso **não equivale** a validação de dose, conduta, desempenho multimodal ou segurança clínica em pacientes. Antes de uso institucional, homologar os protocolos, testar o modelo com casos representativos e implantar autenticação e auditoria compatíveis com a organização.
