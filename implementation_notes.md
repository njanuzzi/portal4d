# Diagnóstico de prévia local

## 2026-08-27 — Renderização inicial

A build de produção concluiu depois da correção da ordem de estilos, mas a prévia Vite abriu com o elemento `#root` vazio. A inspeção do navegador confirmou que o HTML e os módulos foram carregados, sem erro visível no console, porém o aplicativo não montou conteúdo. A próxima correção deve investigar a decisão de rota e o estado inicial do `AppContent`, mantendo a produção sem alterações.

## 2026-08-27 — Validação da home Atlas

Após centralizar a configuração do Supabase usada por um módulo privado carregado no bundle, a build de produção renderizou corretamente. A home apresenta as imagens humanas editoriais, a espiral isolada para os quatro movimentos do método, e o percurso isolado em seis etapas. A seleção da estação **Direcionar** atualizou apenas o painel do método, confirmando que não há mais repetição entre método e atendimento.

## 2026-08-27 — Interação do percurso e página Sobre

A seleção de **Execução** alterou exclusivamente o painel do percurso, mostrando que a lógica de seis etapas é independente da espiral do método. A rota pública `/sobre` renderizou com a fotografia original da Núbia, a apresentação institucional, a formação e uma chamada para a sessão de avaliação. A navegação principal e o rodapé apontam corretamente para o novo destino.

## 2026-08-27 — Biblioteca e rastreamento

A rota pública `/conteudos` renderiza um estado editorial de início sem inventar artigos, como esperado antes da primeira publicação no painel privado. O novo arquivo `/robots.txt` responde como texto simples, permite rastreamento da área pública e referencia corretamente o sitemap, substituindo o comportamento anterior que redirecionava para a área de membros.

## 2026-08-27 — Limites de validação local

As novas rotas, funções de Vercel e componentes foram compilados. A tipagem global do repositório ainda acusa 75 erros preexistentes em telas privadas relacionadas a tipos de banco ausentes ou defasados; a filtragem específica das novas rotas e do editor não retornou erros. A migration da Biblioteca e as variáveis de servidor da Vercel ainda precisam ser configuradas antes de testar criação, upload e publicação de artigos com uma conta de terapeuta.
