# PR 91 — Assinatura do webhook Tally

Data: 17/09/2026

## Problema

`tally-schema-webhook` está em produção com `verify_jwt=false`, o que é esperado para um webhook externo.

O problema é que, antes desta PR, a função não validava nenhuma assinatura ou segredo próprio do Tally.

Como a função usa `SUPABASE_SERVICE_ROLE_KEY`, uma requisição forjada para o endpoint poderia:

- procurar cliente por e-mail;
- criar `auth.users` / `profiles`;
- criar `client_assessments`;
- gravar `client_schema_scores`.

Existe pelo menos um assessment real com `source='tally'`, então o endpoint já foi utilizado em produção.

## Solução

Usar o Signing Secret nativo do Tally.

A função passa a exigir:

- método `POST`;
- secret `TALLY_SCHEMA_SIGNING_SECRET` configurado no ambiente;
- header `Tally-Signature`;
- HMAC-SHA256 válido sobre `JSON.stringify(payload)`, com assinatura em Base64.

A verificação usa `crypto.subtle.verify`.

Requisições:

- sem secret configurado: `503` (fail closed);
- sem assinatura ou assinatura inválida: `401`;
- método diferente de POST/OPTIONS: `405`.

Nenhuma lógica de parsing, criação de cliente ou cálculo dos 16 esquemas foi alterada.

## Configuração obrigatória antes do deploy

A nova versão da Edge Function NÃO deve ser publicada antes dos passos abaixo.

### 1. Tally

No formulário que envia para `tally-schema-webhook`:

1. abrir **Integrations → Webhooks**;
2. editar o webhook existente;
3. habilitar/adicionar **Signing secret**;
4. guardar o valor com segurança.

O secret não deve ser colocado no GitHub.

### 2. Supabase

Adicionar o mesmo valor como secret da Edge Function/projeto:

`TALLY_SCHEMA_SIGNING_SECRET`

O conector usado nesta estabilização não expõe mutação de Edge Function secrets, então esta etapa precisa ser feita pelo Dashboard/CLI autorizado.

### 3. Deploy

Somente depois do mesmo secret existir nos dois lados:

- publicar nova versão de `tally-schema-webhook`;
- manter `verify_jwt=false`, pois a autenticação passa a ser a assinatura do webhook.

## Validação pós-deploy

1. Enviar submissão real/teste pelo Tally e confirmar HTTP 2xx.
2. Confirmar no Tally Events Log que não houve retry/401.
3. Confirmar no Supabase que o assessment foi criado.
4. Chamada sem `Tally-Signature` deve retornar 401.
5. Chamada com assinatura inválida deve retornar 401.
6. Reexecutar a mesma submissão não deve duplicar o assessment; já existe índice único parcial em `tally_submission_id`.

## Fora do escopo

- redesign dos questionários nativos;
- trocar `assessment_id` por capability token;
- hardening de outros webhooks;
- alterar o cálculo do Inventário de Esquemas.

## Próxima frente

Os questionários nativos usam o UUID do assessment como capability implícita para retomar/salvar rascunhos. Isso deve ser tratado separadamente, com token de edição específico, para não misturar uma mudança transversal em 8 instrumentos com este webhook.
