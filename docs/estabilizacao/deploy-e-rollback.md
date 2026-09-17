# Deploy e rollback seguros — Portal4D

## Objetivo

Reduzir o risco de indisponibilidade ou perda de dados durante a estabilização e em mudanças futuras.

## 1. Classifique a mudança antes do merge

### Tipo A — somente documentação/UI sem persistência
Risco baixo. Ex.: texto, layout, documentação.

### Tipo B — aplicação com leitura/escrita em estruturas existentes
Risco moderado. Ex.: nova tela usando tabelas/RPCs já existentes.

### Tipo C — banco, RLS, Auth, Edge Functions, webhooks ou integrações
Risco alto. Exige plano de rollback explícito e smoke test direcionado.

### Tipo D — mudança destrutiva
Risco crítico. Ex.: DROP, rename incompatível, alteração de tipo destrutiva, remoção de policy/RPC/coluna ainda usada. Deve ser decomposta em etapas expand → migrate → contract.

## 2. Antes do deploy

- Registrar o commit/PR que está atualmente estável em produção.
- Confirmar que a nova PR tem escopo pequeno e compreensível.
- Identificar tabelas, funções, policies, rotas e integrações afetadas.
- Executar build/lint/typecheck aplicáveis à etapa atual.
- Validar preview quando houver mudança de frontend.
- Definir quais itens do `smoke-test.md` serão executados.
- Para mudança de banco, confirmar existência de backup/restauração compatível com o plano do projeto antes de qualquer operação destrutiva.
- Não usar dados clínicos reais para teste técnico.

## 3. Estratégia para mudanças de banco

### Expand
Criar a estrutura nova sem remover a antiga.

Exemplos:
- adicionar nova coluna nullable;
- criar nova tabela;
- criar nova RPC com nome/assinatura nova;
- adicionar policy nova sem remover imediatamente a antiga quando isso for seguro e intencional.

### Migrate
Fazer aplicação e dados migrarem para a nova estrutura.

- frontend/backend passam a escrever no formato novo;
- leituras podem manter fallback temporário;
- backfill deve ser idempotente ou claramente controlado;
- medir/validar antes de prosseguir.

### Contract
Só depois da confirmação em produção:

- remover coluna antiga;
- revogar função antiga;
- remover policy antiga;
- retirar fallback de compatibilidade.

A etapa `contract` deve preferencialmente ocorrer em PR separada.

## 4. Estratégia para RLS e SECURITY DEFINER

Nunca alterar em massa.

Para cada função/policy:

1. Identificar callers no frontend, Edge Functions, Vercel/API e triggers.
2. Classificar quem precisa executar: `anon`, `authenticated`, terapeuta, cliente ou somente backend.
3. Criar teste/smoke test correspondente.
4. Corrigir validações internas, `search_path` e grants.
5. Validar em preview/ambiente controlado quando possível.
6. Aplicar a menor mudança de permissão necessária.
7. Executar smoke test imediatamente após deploy.

Se login, cadastro, diário, relatórios ou instrumentos quebrarem, reverter o lote antes de continuar para a próxima função.

## 5. Edge Functions e webhooks

- Versionar no GitHub o mesmo código implantado no Supabase.
- Evitar editar produção sem registrar a mudança no repositório.
- Quando um hotfix direto em produção for inevitável, abrir imediatamente uma PR de sincronização.
- Manter compatibilidade do payload durante transições.
- Para webhooks públicos, validar assinatura/segredo no próprio handler quando JWT não for aplicável.
- Não alterar simultaneamente produtor e consumidor sem uma fase de compatibilidade.

## 6. Aplicação/frontend

Antes de mergear:

- preview abre;
- autenticação funciona quando afetada;
- rotas públicas e privadas mantêm redirecionamentos esperados;
- erros de rede possuem estado recuperável quando o fluxo é crítico;
- não introduzir dependência de coluna/função de banco que ainda não esteja disponível na produção no momento em que o frontend entrar no ar.

Quando banco + frontend precisarem mudar juntos, preferir:

1. backend/banco compatível primeiro;
2. frontend novo depois;
3. remoção do caminho antigo por último.

## 7. Rollback por tipo

### Frontend/Vercel
Reimplantar o último commit estável conhecido.

### Edge Function
Reimplantar a versão anterior versionada no GitHub. Por isso o repositório precisa ser a fonte de verdade.

### Migration aditiva
Normalmente não precisa ser revertida imediatamente: deixar coluna/tabela nova sem uso é mais seguro do que executar DDL reverso sob pressão.

### Mudança de RLS/grant
Restaurar a policy/grant anterior previamente registrada e executar imediatamente o smoke test de isolamento/autorização.

### Backfill/dados
Não executar rollback destrutivo improvisado. Usar backup ou script reversível previamente preparado quando necessário.

## 8. Após o deploy

Executar primeiro os fluxos mais próximos da mudança e depois os fluxos críticos mínimos:

- login terapeuta;
- login cliente;
- leitura/escrita principal afetada;
- isolamento entre usuários quando segurança estiver envolvida;
- logs/erros da função alterada;
- integração externa afetada.

Registrar qualquer diferença entre o que foi mergeado e o que efetivamente foi aplicado em produção.

## 9. Regra de parada

Não continuar uma sequência de PRs de estabilização se a etapa anterior deixou regressão conhecida em produção. Corrigir/reverter primeiro, depois retomar.

## 10. Baseline da PR #81

A PR #81 não requer rollback de runtime porque não altera código executável, banco ou infraestrutura. Se houver necessidade de desfazê-la, basta reverter os commits de documentação.