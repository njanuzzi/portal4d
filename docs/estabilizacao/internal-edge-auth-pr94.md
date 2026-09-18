# PR 94 — Autenticação de chamadas internas privilegiadas

Data: 17/09/2026

## Problema

Quatro jobs de `pg_cron` e o trigger de cadastro do ManyChat chamavam Edge Functions com `verify_jwt=false` sem uma credencial interna real.

Endpoints envolvidos:

- `generate-bot-context`;
- `send-push-notifications`;
- `send-diary-reminder-emails`;
- `send-diary-fill-reminder-emails`;
- `manychat-register-subscriber`.

O primeiro processa conteúdo clínico e gera custo de IA. Os demais enviam notificações/e-mails ou alteram integração de cliente. Eles não devem ser disparáveis livremente pela internet.

## Modelo adotado

A migration gera um token aleatório de alta entropia no próprio banco.

- plaintext: armazenado somente no Supabase Vault como `portal4d_internal_edge_token`;
- banco privado: guarda somente SHA-256 em `app_private.internal_edge_auth`;
- GitHub: não contém o valor do token;
- frontend: nunca recebe o token.

A RPC `verify_internal_edge_token(text)` é `SECURITY DEFINER`, possui `search_path` fixo e só pode ser executada por `service_role`.

## pg_cron

Os quatro jobs mantêm exatamente os mesmos horários, URLs e payload `{}`. A única mudança é adicionar:

`X-Portal-Internal-Token`

O valor é lido em tempo de execução de `vault.decrypted_secrets`.

## ManyChat

`manychat-register-subscriber` precisa preservar dois callers legítimos:

1. trigger interno do banco: autorizado pelo token do Vault;
2. botão na ficha do cliente: autorizado pelo JWT da terapeuta e conferência de `profiles.role = 'therapist'`.

Cliente autenticado, anon ou request sem credencial recebe `403`.

O trigger `trigger_register_manychat_subscriber` deixa de usar o marcador estático `Bearer internal-trigger` e passa a enviar o token real do Vault.

## Ordem de deploy

A migration pode ser aplicada antes das Edge Functions sem interrupção:

1. migration cria token/Vault/verificador e atualiza callers;
2. código antigo ignora o header adicional e continua funcionando;
3. publicar as 5 Edge Functions endurecidas;
4. depois do deploy, chamadas sem credencial passam a receber 403.

Isso evita janela de indisponibilidade.

## Validação já executada

Smoke test completo com `ROLLBACK` confirmou:

- geração e leitura do token no Vault;
- token correto aceito;
- token incorreto rejeitado;
- `anon` e `authenticated` sem EXECUTE na RPC;
- `service_role` com EXECUTE;
- 4 crons atualizados com o header;
- trigger ManyChat atualizado;
- rollback restaurou integralmente jobs, trigger, Vault, tabela e função.

## Fora do escopo

Continuam para auditoria posterior:

- `whatsapp-manychat-webhook`;
- abuso/rate limiting do `client-self-signup`;
- demais endpoints públicos por design;
- os 8 pares de assessment da PR93, cujo deploy de produção aguarda o frontend novo no Vercel.
