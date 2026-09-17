# PR 92 — Aposentadoria das integrações Tally

Data: 17/09/2026

## Contexto

A integração com Tally não é mais utilizada.

Por isso, a PR 91 (assinatura HMAC para `tally-schema-webhook`) foi mergeada no código, mas **nunca foi publicada na Edge Function de produção**. Antes da ativação, foi decidido aposentar o Tally por completo.

## Escopo

As duas Edge Functions relacionadas ao Tally passam a responder apenas:

- HTTP `410 Gone`;
- payload `integration_retired`;
- sem acesso ao Supabase;
- sem `SUPABASE_SERVICE_ROLE_KEY`;
- sem parsing de payload;
- sem criação/alteração de usuários, profiles, assessments ou scores.

Funções aposentadas:

- `tally-schema-webhook`
- `tally-client-signup`

## Por que 410 em vez de exclusão imediata

O conector disponível nesta estabilização permite deploy de Edge Functions, mas não expõe uma operação de delete/undeploy.

Publicar uma implementação tombstone com 410:

- elimina o comportamento privilegiado;
- mantém resposta explícita para qualquer integração antiga esquecida;
- facilita auditoria;
- evita deixar endpoint ativo com código legado.

Uma remoção definitiva pelo Dashboard/CLI pode ser feita depois, se desejado.

## Produção

Nenhuma alteração de banco é necessária.

Depois do merge e deploy das duas funções:

- ambas devem permanecer com `verify_jwt=false`;
- isso não representa risco porque o código não executa ação privilegiada e sempre retorna 410;
- qualquer chamada antiga do Tally falhará de forma explícita.

## PR 91

O mecanismo de `TALLY_SCHEMA_SIGNING_SECRET` deixa de ser necessário.

Não criar esse secret no Supabase e não configurar Signing Secret no Tally.
