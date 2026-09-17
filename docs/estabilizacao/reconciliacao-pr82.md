# PR 82 — Reconciliação GitHub × Supabase produção

Data do inventário: 2026-09-17

## Objetivo

Registrar no GitHub o backend que já está efetivamente implantado no Supabase e mapear a divergência do histórico de migrations sem executar mudanças destrutivas ou alterar o runtime de produção.

Esta PR **não faz deploy**, **não executa migrations** e **não muda RLS/Auth**.

---

## Edge Functions

### Estado encontrado

- Produção: **43 Edge Functions ativas**.
- `main` antes desta PR: **30 funções versionadas**.
- Apenas em produção: **13 funções**.
- Esta PR adiciona as 13 funções ausentes ao repositório.

### Funções recuperadas do runtime de produção

1. `send-push-notifications`
2. `tally-schema-webhook`
3. `generate-technical-report`
4. `revise-technical-report`
5. `generate-client-report`
6. `revise-client-report`
7. `tally-client-signup`
8. `send-diary-reminder-emails`
9. `send-diary-fill-reminder-emails`
10. `cal-webhook`
11. `schema-assessment-save`
12. `import-esmeralda-test-sessions`
13. `review-roteiro`

`import-esmeralda-test-sessions` já está desativada no próprio runtime e retorna HTTP 410. Ela foi versionada somente para que o estado implantado não fique invisível; remoção definitiva é uma decisão de limpeza posterior.

### Exceções intencionais: secrets hardcoded

Durante a reconciliação foram encontrados valores secretos escritos diretamente no código de produção em:

- `cal-webhook`: secret HMAC usado para validar webhooks do Cal.com;
- `tally-client-signup`: token usado na URL do webhook do Tally.

Os valores **não foram copiados para o repositório público**.

A versão GitHub usa:

- `CAL_WEBHOOK_SECRET`;
- `TALLY_CLIENT_SIGNUP_TOKEN`.

Produção permanece inalterada nesta PR. A migração para secrets de ambiente exige rotação coordenada com os respectivos provedores e deve ocorrer em uma mudança separada com smoke test, evitando indisponibilidade dos webhooks.

### Spot-check de funções já existentes nos dois lados

Além das 13 funções ausentes, foram comparados manualmente runtime de produção e `main` em cinco fluxos críticos que tiveram mudanças recentes:

- `schema-assessment-start`;
- `smi-assessment-start`;
- `sync-notion-sessions`;
- `generate-monthly-report`;
- `client-self-signup`.

Não foi encontrada diferença funcional nesses cinco arquivos. Esta checagem é uma amostragem de alto risco, não uma declaração de igualdade byte a byte das outras 25 funções compartilhadas.

---

## Histórico de migrations

### Estado encontrado

- Histórico registrado em `supabase_migrations.schema_migrations` na produção: **63 migrations**.
- Arquivos em `supabase/migrations` no GitHub: **57 migrations**.
- Correspondência exata por **timestamp + nome**: somente **6 migrations**.
- Nomes lógicos presentes nos dois lados: **36**; muitos possuem timestamps diferentes.
- Nomes presentes no histórico de produção e ausentes do repositório: **27**.
- Nomes presentes no repositório e ausentes do ledger atual de produção: **21**.

### As 6 correspondências exatas

- `20260826172455_fix_delete_client_null_auth_bypass`
- `20260826173912_restrict_profiles_select_policy`
- `20260826173921_restrict_reports_policies`
- `20260826173931_remove_hardcoded_service_role_key_from_trigger`
- `20260827012124_add_view_tracking_to_reports_and_session_reports`
- `20260827145037_add_qa_notes_to_session_reports`

### Produção → nomes ausentes do repositório

- `create_financas_casal`
- `fix_delete_client_cascade`
- `create_scheduling_contacts`
- `create_instagram_posts_storage_bucket`
- `create_schema_domains_questions_modes`
- `seed_schema_domains_questions_modes`
- `fix_question_text_to_match_live_tally`
- `create_client_assessments_and_scores`
- `create_client_schema_reports`
- `add_previous_content_to_client_schema_reports`
- `add_client_content_status_and_history`
- `fix_client_schema_reports_client_select_policy`
- `create_client_published_reports`
- `add_wiki_content_to_schema_domains`
- `create_report_observations`
- `redesign_report_observations_with_status`
- `fix_therapist_rls_and_add_observation_threads`
- `restrict_delete_on_observations_with_replies`
- `add_report_view_tracking`
- `add_client_signup_feedback`
- `add_check_account_role_rpc`
- `add_diary_reminder_preference`
- `create_appointments`
- `enable_realtime_appointments`
- `add_answers_and_status_to_leads`
- `bot_context_nightly_cron`
- `add_roteiro_review_columns`

### Repositório → nomes não registrados no ledger atual de produção

- `create_portal_d4_schema`
- `create_therapist_user_nubia`
- `fix_profiles_rls_recursive_loop`
- `fix_all_rls_remove_profiles_subquery`
- `20260503030000_fix_nubia_password_and_identity`
- `fix_diaries_and_questions_rls_policies`
- `create_client_tokens`
- `fix_diary_order_column`
- `add_update_client_diary_entry`
- `delete_auth_user_on_profile_delete`
- `add_update_client_profile_rpc`
- `add_options_to_diary_questions`
- `add_day_notes`
- `add_diary_availability`
- `add_question_required`
- `add_client_invites`
- `add_get_client_last_login`
- `add_get_clients_last_login_bulk`
- `add_client_login_tracking`
- `add_client_goals`
- `create_content_articles`

> Ausência no ledger não prova que o efeito SQL não exista em produção. Parte do schema inicial pode ter sido criada antes do ledger atual, por SQL direto ou por outro fluxo de implantação. Por isso a comparação precisa ser semântica, não apenas por nome de arquivo.

---

## Por que esta PR não renomeia nem reaplica migrations

Renomear os arquivos existentes para os timestamps de produção ou copiar SQL histórico diretamente para `supabase/migrations` sem validar um banco limpo pode fazer a CLI interpretar mudanças antigas como ainda pendentes e tentar executá-las novamente.

Os riscos incluem:

- `CREATE TABLE`/`ALTER TABLE` duplicado;
- políticas RLS duplicadas ou substituídas fora de ordem;
- triggers/cron duplicados;
- backfills executados novamente;
- alteração de dados reais;
- downtime por DDL desnecessário.

Portanto, na PR 82 o ledger é documentado, mas **nenhum migration repair é executado em produção**.

A reconciliação segura do histórico deve ser validada primeiro em banco descartável/staging: reconstruir a partir das migrations versionadas, comparar schema resultante com produção e só então decidir se o histórico precisa de `repair`, snapshots ou migrations de baseline.

---

## Estado especial da Oficina de Roteiro

Produção já contém:

- migration `add_roteiro_review_columns`;
- colunas `ai_review`, `ai_rewrite`, `reviewed_at`;
- Edge Function `review-roteiro`.

A função passa a estar versionada nesta PR, mas o frontend correspondente continua fora de `main` porque a PR #62 permanece draft. Incorporar esse comportamento visível é escopo posterior (planejado para a etapa de drift funcional), não desta reconciliação de infraestrutura.

---

## Validação desta PR

- Diff revisado: 13 funções novas + este documento; nenhum arquivo de frontend ou migration alterado.
- Busca no patch confirmou que os dois valores secretos encontrados em produção não foram incluídos no GitHub.
- PR está mergeable contra `main`.
- Não houve deploy, `db push`, `apply_migration`, alteração de secret, policy ou Auth.
- Tentativa de executar as checagens locais a partir de um clone do branch não foi possível neste ambiente porque a rede do container não resolve `github.com`. Portanto esta PR **não declara `build/lint/typecheck` executados localmente**. Como os arquivos adicionados são Edge Functions Deno não importadas pelo bundle Vite atual, esse bloqueio não modifica o estado da produção, mas a validação deve permanecer explicitamente registrada.

---

## Critério de conclusão da PR 82

A PR pode ser considerada pronta quando:

- as 13 Edge Functions antes exclusivas da produção estiverem representadas no GitHub;
- nenhum secret hardcoded tiver sido publicado;
- o drift de migrations estiver explicitamente inventariado;
- ficar registrado que nenhuma migration/function desta PR foi aplicada/redeployada em produção;
- o diff não alterar frontend, banco, RLS, Auth ou comportamento de runtime.

Depois do merge, o próximo passo é a tipagem do Supabase baseada no schema real (PR 83), mantendo as mudanças de segurança e rotação de secrets em PRs próprias e testáveis.