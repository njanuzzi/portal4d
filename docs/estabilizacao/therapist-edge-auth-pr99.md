# PR 99 — Autorização explícita de terapeuta nas Edge Functions administrativas

Data: 17/09/2026

## Problema

Algumas Edge Functions administrativas já tinham `verify_jwt=true`, mas usavam
`service_role` internamente sem conferir se o usuário autenticado era realmente
a terapeuta.

Um JWT válido prova que o caller está autenticado, mas não prova a função clínica
ou administrativa daquele usuário.

## Endpoints endurecidos

- `generate-client-report`;
- `generate-technical-report`;
- `revise-client-report`;
- `revise-session-report`;
- `revise-technical-report`;
- `smi-generate-client-report`;
- `smi-generate-technical-report`;
- `whatsapp-send-invite`.

Todos os callers encontrados no frontend estão sob `src/pages/therapist`.

## Nova checagem

Antes de ler qualquer `assessment_id`, `report_id`, `session_report_id` ou
`client_id`, cada função:

1. lê o Bearer JWT;
2. valida o token com `supabase.auth.getUser(jwt)`;
3. consulta `profiles.role` para o `user.id`;
4. aceita somente `role = 'therapist'`;
5. caso contrário retorna `403 Forbidden`.

A checagem não faz decode manual do JWT.

## Escopo

Não há migration, alteração de frontend ou mudança de modelo de dados.

`extract-roteiro`, `review-roteiro`, `generate-monthly-report`,
`send-report-observation` e `sync-notion-sessions` já possuíam checagem de
terapeuta e não foram alteradas.

## ManyChat

O hardening do `whatsapp-manychat-webhook` continua propositalmente fora deste
bloco para preservar a integração ativa do diário até a configuração coordenada
do segredo no Flow Builder.
