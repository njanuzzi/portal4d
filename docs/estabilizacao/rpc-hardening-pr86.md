# PR 86 — Hardening de RPCs / SECURITY DEFINER

Data: 17/09/2026

## Objetivo

Preservar a arquitetura existente de RPCs privilegiadas, mas tornar os privilégios explícitos e verificáveis.

Esta PR não parte da premissa de que `SECURITY DEFINER` é um erro. A auditoria mostrou que ele foi usado deliberadamente em vários fluxos: acesso público por token, operações limitadas de cliente, acesso a `auth.users`, helpers de RLS e triggers internos.

O problema encontrado foi a combinação de:

- default privileges do projeto concedendo `EXECUTE` a `anon`, `authenticated` e `service_role` em funções novas;
- migrations antigas que em alguns casos faziam apenas `REVOKE ... FROM PUBLIC`, o que não remove um grant explícito já concedido ao role `anon`;
- ausência de um gate permanente que obrigasse `search_path` e grants explícitos em novas `SECURITY DEFINER`.

## Estado observado em produção antes da PR 86

- 21 funções `SECURITY DEFINER` no schema `public`;
- as 21 efetivamente executáveis por `anon`, `authenticated` e `service_role`;
- 10 sem `search_path` fixo;
- 3 são trigger functions ligadas a `profiles`;
- `check_account_role` e `submit_client_diary_entry` existem em produção, mas não tinham definição equivalente nas migrations do Git;
- a assinatura atual de `submit_lead` também está à frente da migration histórica do repositório.

Nenhuma alteração desta PR foi aplicada diretamente ao Supabase durante a preparação.

## Matriz de privilégio desejada

### Público por design (`anon` + `authenticated`)

| Função | Motivo |
| --- | --- |
| `check_account_role(text)` | Login consulta o tipo da conta antes de autenticar. O risco de enumeração fica registrado para revisão de fluxo separada. |
| `get_client_diary_data(text,date)` | Link público do diário usa token como credencial. |
| `submit_client_diary_entry(text,date,uuid,jsonb)` | Envio do diário público usa token como credencial. |
| `submit_lead(...)` | Formulário público de lead. |
| `validate_client_token(text)` | Validação de link público. |
| `validate_instrument_invite(uuid,text)` | Convites de instrumentos são acessados antes de login. |
| `is_therapist()` | Helper usado em policies de RLS. Mantido acessível nesta PR para não alterar a semântica das policies atuais. |

### Somente usuário autenticado

| Função | Proteção adicional |
| --- | --- |
| `delete_client(uuid)` | Corpo verifica `auth.uid()` e exige profile `therapist`. |
| `get_client_last_login(uuid)` | Corpo exige profile `therapist`. |
| `get_clients_last_login()` | Corpo exige profile `therapist`. |
| `update_client_profile(...)` | Corpo exige `therapist` e precisa tocar em `auth.users`. |
| `record_client_login()` | Atualiza somente o próprio profile cliente via `auth.uid()`. |
| `record_monthly_report_view(uuid)` | UPDATE limitado por `user_id = auth.uid()`. |
| `record_session_report_view(uuid)` | UPDATE limitado por `client_id = auth.uid()`. |
| `record_report_view(uuid)` | UPDATE limitado por `client_id = auth.uid()`. |
| `record_report_acknowledgment(uuid)` | UPDATE limitado por `client_id = auth.uid()`. |
| `record_smi_report_view(uuid)` | UPDATE limitado por `client_id = auth.uid()`. |
| `record_smi_report_acknowledgment(uuid)` | UPDATE limitado por `client_id = auth.uid()`. |

### Interno / trigger-only

Estas funções são executadas pelo PostgreSQL através de triggers existentes e não devem ser RPCs chamáveis por roles externos:

- `delete_auth_user_on_profile_delete()`;
- `trigger_create_whatsapp_session()`;
- `trigger_register_manychat_subscriber()`.

A migration remove `EXECUTE` de `PUBLIC`, `anon`, `authenticated` e `service_role` para estas três funções. O owner continua podendo executá-las e os triggers existentes continuam sendo o caminho esperado.

## `search_path`

As 10 funções que estavam com `search_path` mutável recebem configuração fixa `public` usando `ALTER FUNCTION`, preservando seus corpos atuais:

- `check_account_role`;
- `delete_auth_user_on_profile_delete`;
- `get_client_last_login`;
- `get_clients_last_login`;
- `record_client_login`;
- `record_report_acknowledgment`;
- `record_report_view`;
- `record_smi_report_acknowledgment`;
- `record_smi_report_view`;
- `trigger_create_whatsapp_session`.

A migration termina com uma assertion que falha se restar qualquer `SECURITY DEFINER` no schema `public` sem `search_path` fixo.

## Default privileges

A migration altera os default privileges de funções criadas pelo role `postgres` no schema `public` para remover o `EXECUTE` automático de:

- `PUBLIC`;
- `anon`;
- `authenticated`.

`service_role` é preservado como role de backend confiável.

A partir desta PR, qualquer nova RPC pública ou autenticada precisa fazer `GRANT EXECUTE` explicitamente na própria migration.

## Hardening de `submit_client_diary_entry`

A definição atual em produção identifica corretamente o cliente pelo token, mas aceitava do navegador:

- `p_diary_id`;
- cada `question_id` dentro de `p_answers`.

Sem verificar se esses IDs pertenciam realmente ao diário atribuído ao cliente.

A versão preparada nesta PR mantém exatamente a mesma assinatura usada pelo frontend, mas passa a validar, antes de qualquer `INSERT`:

1. token válido, não expirado e cliente ativo;
2. diário ativo atribuído ao profile;
3. `p_diary_id` igual ao diário atribuído;
4. `p_answers` como array JSON;
5. todos os `question_id` pertencentes ao diário atribuído.

Entradas inconsistentes retornam erro sem criar registro parcial. O fluxo legítimo atual permanece com a mesma assinatura e formato de sucesso.

## Hardening de `submit_lead`

A RPC é pública por design. Em produção ela aceita `p_status`, e a tabela possui estados administrativos como `aprovado`, `recusado` e `encaminhado`.

O frontend público legítimo usa apenas:

- `novo` — default dos formulários comuns e quiz;
- `selecao` — inscrição para sessão de avaliação.

Os estados administrativos são alterados posteriormente na área autenticada da terapeuta.

A PR 86 mantém a mesma assinatura da RPC, mas restringe a criação pública a `novo` ou `selecao`. Um chamador anônimo não poderá criar um lead já marcado como `aprovado`, `recusado` ou `encaminhado`.

Essa restrição não altera a gestão posterior do lead pela terapeuta.

## `check_account_role`

A função permanece pública nesta PR porque a tela de login a chama antes de `signInWithPassword` para comparar a aba selecionada com o role cadastrado.

Isso permite inferir se um e-mail existe e, quando existe, o tipo da conta. A PR 86 não altera esse fluxo para não misturar hardening de ACL com mudança de autenticação/UX.

Recomendação posterior: avaliar remover a consulta pré-login e validar o role somente após autenticação, ou substituir a resposta por um mecanismo que não revele o role de um e-mail arbitrário.

## Proteção contra regressão futura

Foi adicionado `SQL security guard` no GitHub Actions.

Para migrations novas/alteradas que contenham `SECURITY DEFINER`, o check exige:

- `SET search_path` explícito;
- tratamento explícito do role `anon` por `REVOKE`;
- tratamento explícito do role `authenticated` por `REVOKE`.

O objetivo é impedir que o conhecimento de segurança volte a depender de memória do autor da migration.

## Validação embutida na migration

A migration contém assertions com `has_function_privilege` para confirmar que:

- RPCs públicas continuam acessíveis a `anon`;
- RPCs autenticadas/administrativas deixam de ser acessíveis a `anon`;
- RPCs autenticadas continuam acessíveis a `authenticated`;
- trigger functions deixam de ser diretamente executáveis por roles externos;
- nenhuma `SECURITY DEFINER` permanece com `search_path` mutável.

Se alguma dessas condições não for verdadeira no momento da aplicação, a migration falha em vez de deixar o banco parcialmente endurecido.

## Validação da branch

Antes de liberar a PR para revisão foram confirmados no head da branch:

- `npm run typecheck`: sucesso;
- `SQL security guard`: sucesso;
- preview do Vercel: sucesso.

O repositório não possui workflow de deploy de migrations do Supabase em `main`. Portanto, mergear esta PR versiona as migrations, mas não as aplica automaticamente ao banco de produção.

## Fora do escopo desta PR

- remover `SECURITY DEFINER` em massa;
- mudar RLS das tabelas;
- mudar o fluxo de login de `check_account_role`;
- restringir datas permitidas em `submit_client_diary_entry`;
- adicionar rate limit/anti-spam ao `submit_lead`;
- resolver todo o drift histórico de migrations mapeado na PR 82;
- aplicar estas migrations diretamente em produção antes de review/validação.
