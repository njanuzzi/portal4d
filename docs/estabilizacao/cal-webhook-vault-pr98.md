# PR 98 — Segredo do Cal.com no Vault

Data: 17/09/2026

## Problema

A versão ativa de `cal-webhook` valida corretamente o header
`x-cal-signature-256` com HMAC SHA-256, mas o segredo compartilhado ainda
está embutido no código implantado em produção.

O repositório já evitava versionar esse valor, porém redeployar a versão do
GitHub dependeria de um Edge Function secret `CAL_WEBHOOK_SECRET` que não pode
ser gerenciado pelo conector atual.

## Solução

Mover a validação para uma RPC protegida:

`public.verify_cal_webhook_signature(raw_body, signature)`

A RPC:

- lê `cal_webhook_secret` do Supabase Vault;
- calcula HMAC SHA-256 sobre o body bruto;
- compara em hexadecimal com `x-cal-signature-256`;
- é `SECURITY DEFINER`;
- possui `search_path` fixo;
- pode ser executada apenas por `service_role`.

A Edge Function não recebe nem lê o segredo.

## Rollout coordenado

Antes de aplicar a migration:

1. ler o segredo da versão atualmente ativa de `cal-webhook` sem exibi-lo;
2. gravar exatamente o mesmo valor no Vault como `cal_webhook_secret`;
3. aplicar a migration;
4. publicar a nova Edge Function;
5. smoke test:
   - assinatura inválida → 401;
   - assinatura válida sobre payload sintético sem UID → 400, provando que passou pela autenticação;
6. confirmar que agendamentos existentes permanecem intactos.

Como o valor não muda, nenhuma alteração no painel do Cal.com é necessária.

## Hardening adicional

A Edge Function deixa de devolver mensagens internas de banco/exceção em erros
500. Os detalhes continuam nos logs do servidor.

## Validação prévia

Smoke test transacional com segredo fictício e `ROLLBACK` confirmou:

- HMAC SHA-256 válido aceito;
- assinatura errada rejeitada;
- anon/authenticated sem EXECUTE;
- service_role com EXECUTE;
- Vault e RPC temporários removidos integralmente no rollback.
