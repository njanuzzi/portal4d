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

## 2026-08-27 — Ativação autenticada

O acesso à Vercel e ao projeto Supabase `Portal4D` foi confirmado no navegador conectado da usuária. O editor SQL exibiu a migration, mas a primeira tentativa de execução retornou uma validação de consulta vazia da própria interface. Nenhuma alteração de banco foi confirmada nesta tentativa; a próxima ação é registrar o texto no editor nativo antes de executar novamente.

O editor SQL da Supabase usa Monaco. A automação de preenchimento exibiu o texto, mas não atualizou o estado interno da consulta; inclusive a consulta de leitura `select 1;` foi recusada como vazia. A migration ainda não foi aplicada. A próxima tentativa utilizará o campo `textarea` interno do editor para disparar o evento nativo de entrada antes de executar.

## Configuração da Vercel

A página de configurações Git confirma que o projeto `portal4d` ainda não possui Deploy Hooks. O hook a criar será nomeado `publicar-biblioteca-4d` e ficará vinculado à branch `main`; ele não será acionado durante esta configuração e não modifica a produção até que uma publicação editorial o invoque.

O hook `publicar-biblioteca-4d` foi criado com sucesso para a branch `main`. A usuária aplicou a migration no Supabase e salvou as variáveis `VERCEL_CONTENT_DEPLOY_HOOK_URL` e `SUPABASE_SERVICE_ROLE_KEY` nos ambientes Production e Preview. A Vercel confirma que a prévia da branch `ui/atlas-de-padroes` está pronta, no commit `cbf71c0`; o próximo passo é gerar uma nova prévia após essas variáveis para validar o fluxo editorial.

## Validação autenticada da Biblioteca 4D

A prévia foi redeployada com sucesso após as variáveis serem salvas. A Biblioteca pública em `/conteudos` exibiu corretamente o estado inicial sem artigos. Após autenticação manual da usuária na prévia como terapeuta, `/gestao-conteudos` carregou a gestão protegida e o formulário `novo` abriu com os campos editoriais e a barra Tiptap. Um texto temporário foi inserido apenas no estado local do editor para confirmar a entrada; nenhum rascunho ou artigo foi salvo, nenhuma imagem foi enviada e nenhum hook de publicação foi acionado.

## Ajustes de orientação e validação

O erro relatado no primeiro teste de artigo ocorreu porque o campo `Resumo` recebeu cinco caracteres, enquanto a regra editorial do banco exige entre 20 e 360. A validação da interface foi atualizada para antecipar essa regra, apresentar contagem de caracteres e traduzir quaisquer restrições remanescentes para mensagens compreensíveis. Também foram adicionadas instruções de exploração nos blocos interativos do Método e do Percurso. O deploy do commit `b5c1575` concluiu com sucesso na prévia da branch `ui/atlas-de-padroes`.

Na prévia atualizada, o editor passou a exibir imediatamente a orientação “Escreva pelo menos 20 caracteres. Faltam 20.” para o campo Resumo, e informa o endereço automático, o texto alternativo e a descrição de busca. Um título temporário de cinco caracteres foi preenchido apenas para preparar o teste de bloqueio do resumo curto; nenhum artigo foi salvo ou publicado.

## Revisão mobile — hero e interações

A captura em viewport de 390 px confirmou que a primeira dobra inicia com respiro consistente abaixo do cabeçalho fixo. A assinatura, o título, a descrição e os CTAs permanecem legíveis e não competem com a barra de navegação; a foto da autora continua abaixo dos indicadores de formato, preservando a ordem de leitura. Ainda falta confirmar visualmente a abertura do painel deslizante da espiral e do acordeão de etapas nessa mesma viewport antes do envio à prévia.

O teste automatizado em viewport móvel confirmou os dois comportamentos aprovados: ao tocar em **Desacelerar**, a espiral abre imediatamente um painel deslizante com o respectivo título e conteúdo, e o botão de fechar encerra o painel; ao tocar em **Regulação**, o percurso expande os detalhes no próprio ponto da rota. As capturas mostram que a resposta visual ocorre dentro da área observada, sem depender de um painel fora da dobra.

## Correção de regressão desktop

A prévia desktop exibiu o conteúdo do painel móvel da espiral como um segundo bloco estático, duplicando a explicação de “Detectar” e desorganizando a continuidade da página. A causa foi a ausência de um estado padrão que ocultasse `.atlas-sheet` fora do media query móvel. A correção declara esse painel como oculto em telas amplas e o reativa apenas em `max-width: 600px`; o painel lateral desktop permanece como a única leitura visível nessa largura.

Na inspeção desktop autenticada, a duplicação foi reproduzida somente na prévia anterior ao ajuste. A captura local com Chromium confirmou que o conteúdo do hero e o painel lateral continuam estruturados em desktop; a tentativa de aguardar por tempo virtual não é confiável nesse ambiente porque interrompe o carregamento do aplicativo React. A validação final será feita pela prévia Vercel após o envio da regra de ocultação.
