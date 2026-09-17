# PR 90 — Helper de autorização fora do schema público

Data: 17/09/2026

## Objetivo

Continuar a redução da superfície de `SECURITY DEFINER` sem transformar alertas do Advisor em meta artificial.

Após a PR 89 restaram 14 funções `SECURITY DEFINER` executáveis por `authenticated`. A auditoria classificou uma delas como um caso estrutural claro para remoção do schema exposto:

- `public.is_therapist()`

Ela não é uma RPC de negócio e não possui chamador no frontend. Seu papel é exclusivamente auxiliar policies de RLS e evitar recursão ao consultar `profiles`.

## Mudança

A helper passa a existir como:

`app_private.is_therapist()`

Características:

- schema não exposto pelo PostgREST;
- `SECURITY DEFINER` preservado, porque isso evita recursão de RLS em `profiles`;
- `search_path = pg_catalog`;
- sem acesso para `PUBLIC` ou `anon`;
- `authenticated` e `service_role` recebem apenas `USAGE` no schema e `EXECUTE` na helper.

A antiga `public.is_therapist()` é removida.

## Policies atualizadas

Public:

- `profiles_select_own_or_therapist`
- `reports_therapist_all`
- `therapist manages content articles`
- `usuaria_edita_proprios_roteiros`
- `usuaria_le_proprios_roteiros`

Storage:

- `therapist uploads content images`
- `therapist updates content images`
- `therapist deletes content images`

As policies de `profiles` e `reports` que antes tinham role `PUBLIC` passam explicitamente a `authenticated`. Para anon o comportamento efetivo já era deny, porque `auth.uid()` era nulo e `is_therapist()` retornava false.

## Teste já executado

Foi feito smoke test transacional em produção com `ROLLBACK`:

- criação temporária de `app_private`;
- criação da nova helper;
- atualização de todas as policies dependentes, inclusive Storage;
- remoção temporária da helper pública;
- cliente autenticado continuou lendo apenas o próprio profile;
- cliente não conseguiu ler outros profiles;
- terapeuta autenticado continuou lendo profile de cliente;
- helper privada retornou false para cliente e true para terapeuta;
- anon não recebeu EXECUTE;
- rollback restaurou completamente o banco.

Nenhuma mudança desse teste permaneceu em produção.

## Os outros 13 avisos authenticated

### Permanecem públicos por design

- `get_client_diary_data(text,date)`
- `submit_client_diary_entry(text,date,uuid,jsonb)`
- `submit_lead(...)`
- `validate_client_token(text)`
- `validate_instrument_invite(uuid,text)`

Essas funções atendem fluxos públicos que também podem ser acessados enquanto existe uma sessão autenticada no navegador. Remover `authenticated` poderia quebrar links públicos abertos por um usuário já logado.

### Escrita estreita do próprio cliente

- `record_monthly_report_view(uuid)`
- `record_report_view(uuid)`
- `record_report_acknowledgment(uuid)`
- `record_session_report_view(uuid)`
- `record_smi_report_view(uuid)`
- `record_smi_report_acknowledgment(uuid)`

O cliente não possui UPDATE genérico nessas tabelas. As RPCs privilegiadas escrevem somente timestamps/acknowledgments e limitam o registro por `auth.uid()`. Converter para invoker exigiria ampliar privilégios de tabela/coluna ou redesenhar a camada de escrita.

### Terapeuta com acesso privilegiado real

- `delete_client(uuid)`
- `update_client_profile(...)`

Precisam acessar `auth.users` e mantêm checagem interna de role terapeuta.

## Por que não esconder todas em wrappers apenas para zerar o Advisor

Mover a implementação das demais funções para schema privado e deixar wrappers invoker em `public` reduziria lints, mas não mudaria materialmente o privilégio efetivo que o usuário exerce através do wrapper. Esta PR evita "lint gaming": só remove exposição onde existe ganho arquitetural real.

## Efeito esperado

Após aplicação:

- anon SECURITY DEFINER: 6 → 5;
- authenticated SECURITY DEFINER: 14 → 13.

A helper privada pode continuar sendo `SECURITY DEFINER`, mas deixa de ser uma RPC exposta pelo schema `public`.
