# PR 88 — Redução de SECURITY DEFINER desnecessário

Data: 17/09/2026

## Objetivo

Reduzir a superfície privilegiada sem perseguir uma meta artificial de "zerar" o Security Advisor.

A PR 86 corrigiu grants, `search_path` e funções públicas. A PR 88 revisa as 18 funções `SECURITY DEFINER` ainda executáveis por `authenticated` e separa:

1. funções públicas por design;
2. funções de cliente autenticado que precisam de escrita privilegiada estreita;
3. funções de terapeuta que realmente precisam tocar recursos privilegiados;
4. funções que hoje usam `SECURITY DEFINER` sem necessidade.

## Resultado da auditoria

### Convertidas para SECURITY INVOKER

#### `record_client_login()`

Atualiza somente a linha do próprio usuário:

`WHERE id = auth.uid() AND role = 'client'`

A tabela `profiles` já possui RLS permitindo ao usuário atualizar o próprio perfil. Um smoke test em transação com rollback confirmou que o cliente autenticado consegue executar a função como invoker.

#### `get_client_last_login(uuid)`

Lê `profiles.last_login_at` e já contém checagem explícita de terapeuta.

A policy `profiles_select_own_or_therapist` permite que terapeutas leiam perfis. O smoke test com rollback confirmou o funcionamento como invoker.

#### `get_clients_last_login()`

Lê dados de login de perfis `role='client'` e já contém checagem explícita de terapeuta.

O mesmo RLS de `profiles` cobre essa leitura. O smoke test com rollback confirmou o funcionamento como invoker.

A migration muda somente o modo de segurança das três funções; assinatura, corpo, grants e chamadas do frontend permanecem iguais.

## Funções que permanecem SECURITY DEFINER

### Públicas por design

- `check_account_role(text)` — pré-login; risco de enumeração tratado separadamente.
- `get_client_diary_data(text,date)` — acesso por token.
- `submit_client_diary_entry(text,date,uuid,jsonb)` — escrita pública controlada por token.
- `submit_lead(...)` — formulário público.
- `validate_client_token(text)` — validação de link público.
- `validate_instrument_invite(uuid,text)` — convite público.
- `is_therapist()` — helper de RLS; mantido por enquanto para evitar mudança estrutural nas policies.

### Cliente autenticado com escrita privilegiada estreita

Estas tabelas dão leitura ao cliente, mas não UPDATE genérico. As RPCs escrevem apenas timestamps/acknowledgments no registro do próprio cliente:

- `record_monthly_report_view(uuid)`
- `record_report_view(uuid)`
- `record_report_acknowledgment(uuid)`
- `record_session_report_view(uuid)`
- `record_smi_report_view(uuid)`
- `record_smi_report_acknowledgment(uuid)`

Converter essas funções para invoker exigiria abrir UPDATE ao cliente ou redesenhar privilégios por coluna/policies. Isso aumentaria a superfície e não é recomendado nesta etapa.

### Terapeuta com acesso realmente privilegiado

- `delete_client(uuid)` — precisa excluir em `auth.users`.
- `update_client_profile(...)` — precisa ler/alterar `auth.users`.

Essas duas permanecem SECURITY DEFINER com checagem interna de role terapeuta.

## Validação já executada

Antes de criar esta PR foi executado smoke test transacional em produção:

- as três funções foram temporariamente alteradas para SECURITY INVOKER;
- um cliente autenticado executou `record_client_login()`;
- um terapeuta autenticado executou `get_client_last_login()` e `get_clients_last_login()`;
- a transação foi encerrada com `ROLLBACK`;
- o banco confirmou que as três funções continuavam SECURITY DEFINER após o rollback.

## Efeito esperado no Security Advisor

Após aplicação da migration:

- avisos `authenticated_security_definer_function_executable`: de 18 para 15;
- avisos anon permanecem em 7, pois são fluxos públicos intencionais.

A redução é pequena em número, mas correta em arquitetura: remove privilégio somente onde ele não é necessário.
