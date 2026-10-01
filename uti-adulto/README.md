# UTI Adulto — Gestão de Plantão: publicação no Netlify

Este pacote contém o sistema da revisão d359b1a6f39b344233775286083465b3ed5a4422, com adaptação para Vite, Netlify Functions e banco SQLite remoto Turso. Inclui telas, ficha diária, evolução, passagem de plantão, prescrição, impressão, importação de backup, APIs, autenticação, auditoria e integrações de IA existentes. O código e as migrações da versão original estão incluídos; arquivos de configuração originais estão em original-sites/.

## Antes de começar

Instale Node.js 22.13 ou superior. Crie uma conta Netlify e um banco Turso em https://turso.tech. Copie a URL libsql e gere um token de acesso ao banco. Não reutilize o banco gerenciado pelo ChatGPT: os identificadores e credenciais dessa hospedagem não são exportados pelo código.

Os registros de pacientes, o histórico do banco em produção, sessões, senhas e chaves API não estão no ZIP. Exporte o backup pelo sistema original antes de mudar de endereço. Após publicar, importe esse JSON na função de backup/importação do novo sistema. Essa operação migra os dados contidos no backup; não equivale a uma cópia integral de todas as tabelas internas do banco original. Mantenha o original até conferir o resultado.

## 1. Instalar e criar as tabelas

Extraia o ZIP, abra o terminal nesta pasta e execute:

```bash
npm ci
```

Copie .env.example para .env e preencha TURSO_DATABASE_URL e TURSO_AUTH_TOKEN. Execute:

```bash
npm run db:migrate
```

O comando cria todas as tabelas em ordem e registra as migrações aplicadas. Pode ser executado novamente sem reaplicar as já registradas. Use um banco novo e vazio; não aplique as migrações sobre um banco preexistente sem conferir seu esquema.

## 2. Configurar os segredos no Netlify

No painel do site, abra Environment variables e cadastre com acesso às Functions:

| Variável | Conteúdo |
| --- | --- |
| TURSO_DATABASE_URL | URL libsql do banco Turso |
| TURSO_AUTH_TOKEN | Token do banco |
| ACCESS_PASSWORD | Uma senha de acesso definida por você |
| ACCESS_SESSION_SECRET | Segredo aleatório de pelo menos 32 bytes |
| OPENAI_API_KEY | Sua chave de API para as funções de IA, opcional |

Para gerar o segredo, execute `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Mantenha a senha e os tokens apenas no arquivo .env local e nas variáveis do Netlify. Nenhuma variável deve receber prefixo VITE_. Sem o banco e os segredos de acesso, o servidor retorna 503. Sem a chave OpenAI, use o preenchimento manual e os prompts para IA externa.

## 3. Publicar

Opção por repositório: envie esta pasta a um repositório privado, importe-o no Netlify e use:

- Comando de build: `npm run build`.
- Pasta publicada: `dist`.
- Pasta das funções: `netlify/functions`.
- Node: 22.

O arquivo netlify.toml já configura esses valores. Cadastre as variáveis e publique novamente.

Opção por terminal:

```bash
npx netlify login
npx netlify init
```

Após vincular/criar o site, cadastre as variáveis no painel e execute:

```bash
npx netlify deploy --build --prod
```

Não publique apenas a pasta dist por arrastar e soltar: esse modo não instala o servidor nem conecta o banco. O sistema completo precisa das Functions.

## 4. Conferir e importar os registros

Abra o endereço HTTPS, entre com a senha escolhida, cadastre um registro de teste e confirme que persiste após recarregar. Confira também o acesso em outro dispositivo, o logout, a impressão A4 e as funções de IA com sua chave. Depois, importe o backup exportado do sistema original e revise os pacientes e históricos antes de usar a nova instalação.

## Verificação técnica

```bash
npm run build
npm run test:netlify
```

O teste valida a aplicação das migrações, queries parametrizadas, rollback de lote, login, proteção de origem, bloqueio de sessão e leitura do prontuário. A publicação e conexões reais ao Netlify, Turso e OpenAI dependem das suas credenciais e precisam ser conferidas depois do deploy. Funções síncronas e tamanho de uploads seguem os limites do seu plano Netlify; imagens muito grandes e gerações longas podem excedê-los.

## Referências

- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/functions/configuration/
- https://github.com/tursodatabase/libsql-client-ts
