# Correção do login após publicação

Evidência: os logs de produção mostram POST /auth/login retornando 403, com Origin: null e Sec-Fetch-Site: same-origin no Safari. As tabelas de sessão, tentativas e auditoria existem no banco publicado.

Causa: a validação de origem rejeitava a origem opaca antes de verificar a senha. A política no-referrer do formulário também contribuía para a serialização opaca em navegadores que a aplicam ao Origin.

Correção: Referrer-Policy same-origin; aceitar Origin null somente quando Fetch Metadata do navegador confirma same-origin; continuar rejeitando origens estrangeiras e cross-site. Uma rejeição de login apresenta uma mensagem legível em vez de JSON. Autenticação, cookie seguro, expiração, limitação de tentativas e proteção contra enquadramento continuam ativas. Usar o link direto em uma aba; a página clínica permanece protegida contra iframe.

Validação: 21 testes automatizados aprovados, incluindo a sequência de requisições de login Safari → cookie de sessão → painel HTTP 200 → API de pacientes HTTP 200, com banco efêmero e dados sintéticos. Testadas também rejeições de Origin null sem evidência, cross-site e origem estrangeira. Build e TypeScript aprovados. Esse teste de servidor não equivale a teste interativo no Safari real.

Não foram alterados senha nem dados clínicos de produção.
