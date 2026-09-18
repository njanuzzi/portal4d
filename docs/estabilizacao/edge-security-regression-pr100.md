# PR 100 — Guard de regressão de segurança das Edge Functions

Data: 17/09/2026

## Objetivo

Transformar os hardenings feitos nas PRs 89–99 em checks automáticos de CI.

O Portal não tinha framework de testes. Em vez de adicionar dependências só para
essa camada, a PR usa Node puro e GitHub Actions.

## O que o guard protege

O workflow falha se uma alteração futura remover sem querer:

- autorização explícita de terapeuta nas Edge Functions administrativas;
- token interno dos jobs/automação;
- capability token dos 8 questionários públicos;
- rate limit do cadastro público;
- verificação HMAC do Cal.com pelo Vault;
- segredo interno do notificador de risco;
- tombstones de Tally;
- tombstones de runtimes antigos.

## Escopo deliberado

`whatsapp-manychat-webhook` não entra no guard ainda porque seu hardening foi
adiado para o final e precisa ser coordenado com o Flow Builder do ManyChat.

## Custo

Nenhuma dependência npm nova.

O workflow roda apenas quando mudam:

- `supabase/functions/**`;
- o próprio script;
- o próprio workflow.

Isso não exige banco, secrets ou chamadas externas.
