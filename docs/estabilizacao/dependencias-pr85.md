# PR 85 — Auditoria controlada de dependências

Data: 17/09/2026

## Objetivo

Reduzir vulnerabilidades conhecidas sem usar `npm audit fix --force`, sem atravessar versões major automaticamente e sem alterar comportamento funcional do Portal4D.

## Baseline

Antes das correções seguras, `npm audit` reportava:

- 50 vulnerabilidades no total;
- 3 low;
- 32 moderate;
- 15 high;
- 0 critical.

Entre os pacotes diretos sinalizados estavam `react-router-dom`, `postcss`, `vite`, `dompurify` e o conjunto TipTap.

## Estratégia aplicada

Foi executado somente:

```bash
npm audit fix --package-lock-only
```

Sem `--force`.

O `package.json` não foi alterado e nenhuma dependência foi deliberadamente movida para outra major. O npm apenas recalculou o lockfile dentro das faixas semver já declaradas.

Depois do novo lockfile foram executados:

```bash
npm ci
npm run typecheck
npm run build
npm audit
```

`typecheck` e `build` passaram.

## Resultado

O novo estado reporta:

- 32 vulnerabilidades no total;
- 2 low;
- 28 moderate;
- 2 high;
- 0 critical.

Isso representa redução de 18 achados no total e de 13 achados classificados como high, sem atualização forçada de major.

Os avisos diretos de `react-router-dom`, `dompurify` e `postcss` deixaram de aparecer após a atualização segura do lockfile.

## O que permanece

### TipTap — não corrigir automaticamente nesta PR

O cluster TipTap responde pela maior parte dos avisos moderados restantes. A correção indicada pelo npm exige migrar os pacotes TipTap da linha 2.x para 3.31.3 ou superior, marcada pelo próprio npm como breaking change.

Como o Portal4D usa TipTap no editor da Biblioteca 4D, essa mudança deve ser feita em PR própria, com teste do editor, links, imagens, serialização do conteúdo existente e renderização dos artigos.

### Vite / esbuild — não corrigir automaticamente nesta PR

O npm informa que remover o conjunto restante relacionado a `vite`/`esbuild` exige atualização para Vite 8.x, também uma breaking change.

Os advisories encontrados nesse grupo estão ligados principalmente ao servidor de desenvolvimento/build tooling. O Portal publicado no Vercel recebe o bundle estático já construído; portanto não se deve tratar esse grupo como equivalente a uma vulnerabilidade de runtime do navegador. Mesmo assim, a atualização deve ser planejada.

### brace-expansion — high transitivo

Permanece um aviso high em `brace-expansion`, dependência transitiva utilizada pelo tooling. Não é uma dependência direta do código do Portal nem um módulo deliberadamente chamado pela aplicação no navegador.

Deve ser removido em uma atualização controlada da cadeia de tooling, evitando `overrides` arbitrários sem conhecer a compatibilidade dos pais.

### ESLint/tooling

Também permanece aviso de baixa severidade na cadeia do ESLint (`@eslint/plugin-kit`). É tooling de desenvolvimento e deve ser tratado junto da atualização coordenada do stack de build/lint.

## Impacto desta PR

A mudança permanente desta PR é apenas o `package-lock.json` recalculado dentro das faixas já declaradas no `package.json`, além deste documento.

Não há:

- migration;
- mudança de banco;
- mudança de RLS/Auth;
- Edge Function alterada;
- alteração de fórmula clínica;
- nova funcionalidade;
- uso de `npm audit fix --force`.

## Validação final

O lote seguro foi validado com `npm ci`, `npm run typecheck` e `npm run build`, todos com sucesso. A branch final mantém somente o lockfile atualizado e esta documentação; os workflows temporários de auditoria e aplicação foram removidos antes da revisão.

## Próximas etapas recomendadas

1. PR específica para migração TipTap 2 → 3, com smoke test completo da Biblioteca 4D.
2. PR específica para atualização Vite/plugin React e cadeia de tooling, validando build e preview antes do merge.
3. Reexecutar `npm audit` após cada uma para medir o resultado real, em vez de perseguir apenas a contagem bruta de advisories.
