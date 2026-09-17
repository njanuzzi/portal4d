# Estabilização do Portal4D

Este diretório registra o programa de estabilização iniciado na PR #81.

## Objetivo

Reduzir risco técnico sem interromper a aplicação, preservando o comportamento atual enquanto o projeto ganha uma base mais reproduzível, testável e segura.

A estratégia é incremental: **observar → documentar → proteger → corrigir em pequenos lotes → remover legado somente depois da validação**.

## Princípios

1. **Produção continua funcionando durante a estabilização.**
2. **Uma PR de estabilização deve ter escopo pequeno e rollback claro.**
3. **Mudanças de banco seguem expand → migrate → contract.** Nunca remover uma coluna/policy/API antes de a substituta estar implantada e validada.
4. **GitHub deve voltar a ser a fonte de verdade.** Toda migration, Edge Function e mudança de infraestrutura em produção deve existir no repositório.
5. **Dados clínicos não são usados em testes.** Smoke tests e testes automatizados devem usar contas e registros dedicados de teste.
6. **Refatoração não deve alterar comportamento.** Mudança funcional e refatoração estrutural ficam em PRs separadas.
7. **Segurança é corrigida em lotes pequenos.** Não alterar todas as policies/RPCs de uma vez.

## Sequência planejada

- **PR 81 — Baseline e proteção do estado atual**: documentação, inventário, smoke test e procedimento de rollback. Sem mudança de runtime.
- **PR 82 — Reconciliação GitHub × produção**: migrations e Edge Functions passam a representar fielmente o Supabase em produção.
- **PR 83 — Tipagem Supabase**: tipos gerados a partir do schema real e redução dos erros de TypeScript até zero.
- **PR 84 — CI**: lint, typecheck, build e primeiros testes obrigatórios antes de merge.
- **PRs 85–87 — Segurança Supabase**: revisão de `SECURITY DEFINER`, grants, `search_path`, OTP e proteção de senha em pequenos lotes.
- **PR 88 — Performance**: índices e otimizações de RLS sem alteração funcional.
- **PR 89 — Isolamento de dados**: testes de autorização entre cliente, terapeuta e anon.
- **PR 90 — Drift funcional restante**: consolidar, entre outros pontos, o estado da Oficina de Roteiro/PR #62.
- **PRs posteriores — Refatoração**: componentes grandes, código legado e motor comum de instrumentos.

## Documentos desta fase

- [`baseline-2026-09-17.md`](./baseline-2026-09-17.md): fotografia técnica do sistema no início da estabilização.
- [`smoke-test.md`](./smoke-test.md): fluxos mínimos que devem continuar funcionando após mudanças relevantes.
- [`deploy-e-rollback.md`](./deploy-e-rollback.md): procedimento seguro para mudanças de aplicação, banco e funções.

## Regra de merge durante a estabilização

Uma PR que altera comportamento crítico só deve ser mergeada quando:

- o escopo estiver explicitado;
- houver caminho de rollback;
- build/typecheck/lint aplicáveis tiverem sido executados;
- o preview tiver sido validado quando houver UI;
- migrations destrutivas estiverem ausentes ou tiverem plano explícito de recuperação;
- o smoke test afetado estiver identificado;
- alterações em produção forem registradas no GitHub na mesma mudança ou imediatamente depois em hotfix de sincronização.

A PR #81 é propositalmente documental e não altera código executável, banco, Edge Functions, autenticação, RLS, rotas ou integrações.