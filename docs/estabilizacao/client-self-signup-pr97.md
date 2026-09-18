# PR 97 — Hardening do cadastro público

Data: 17/09/2026

## Contexto

`client-self-signup` é público por design e está em uso real. Antes desta PR,
o endpoint dependia apenas de honeypot para abuso automatizado, apesar de usar
`service_role` para criar usuários em Auth, profiles e convites.

## Proteções adicionadas

- somente `POST` (além de `OPTIONS`);
- honeypot mantido;
- validação server-side de e-mail, telefone e tamanhos máximos;
- rate limit de 1 hora:
  - até 10 tentativas por IP;
  - até 3 por e-mail;
  - até 3 por telefone;
- `429` com `Retry-After: 3600` quando bloqueado;
- IP/e-mail/telefone não são armazenados na tabela de rate limit: somente SHA-256;
- linhas antigas do rate limiter são limpas automaticamente;
- HTML escapado no e-mail de notificação à terapeuta;
- detalhes de exceção não são mais devolvidos ao navegador;
- logs de sucesso deixam de registrar e-mail;
- se Auth criar o usuário mas `profiles` falhar, o usuário recém-criado é removido.

## Infraestrutura

Tabela privada: `app_private.client_signup_rate_limits`.

RPC: `public.check_client_signup_rate_limit(text,text,text)`.

A RPC é `SECURITY DEFINER`, possui `search_path` fixo e é executável somente
por `service_role`.

## IP

A Edge Function prioriza `cf-connecting-ip`, depois `x-real-ip` e por último
`x-forwarded-for`. Se nenhum estiver disponível, e-mail e telefone continuam
limitando abuso.

## Smoke test

Executado em transação com `ROLLBACK`:

- 3 tentativas iguais permitidas;
- 4ª tentativa bloqueada pela regra de e-mail/telefone;
- `anon` e `authenticated` sem EXECUTE;
- `service_role` com EXECUTE;
- tabela e função removidas integralmente no rollback.

## ManyChat

`whatsapp-manychat-webhook` foi auditado, mas não entra nesta PR.

A integração não registra atividade desde 25/08/2026 e o frontend marca a ativação
do WhatsApp como temporariamente desabilitada. Quando for reativada, a External
Request do ManyChat deve enviar um segredo dedicado em header personalizado.
