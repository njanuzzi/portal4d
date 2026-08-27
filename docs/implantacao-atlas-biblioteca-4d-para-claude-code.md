# Implantação Atlas de Padrões e Biblioteca 4D — instruções para Claude Code

## Copie esta solicitação inteira para o Claude Code

> Trabalhe **somente** no repositório `njanuzzi/portal4d`, na branch aberta `ui/atlas-de-padroes`, que possui o pull request [#43](https://github.com/njanuzzi/portal4d/pull/43) para `main`. O objetivo é revisar, preservar e, quando necessário, concluir a implantação da nova interface pública **Atlas de Padrões** e da **Biblioteca 4D**.
>
> **Regra absoluta de segurança:** não faça merge em `main`, não promova um deployment para produção, não altere o domínio `www.nubiajanuzzi.com`, não execute comandos destrutivos (`git reset --hard`, remoção de migrations, truncates ou exclusões de tabelas) e não exponha valores de variáveis de ambiente. O trabalho deve continuar na branch, com Preview da Vercel, até a aprovação explícita da proprietária.
>
> Antes de editar, execute `git fetch origin`, entre em `ui/atlas-de-padroes`, inspecione `git status`, compare a branch com `origin/main` e informe qualquer alteração concorrente. Não force-pushe e não sobrescreva trabalho já existente. Se for preciso incorporar mudanças de `main`, explique o conflito e proponha o caminho mais conservador antes de resolvê-lo.

## 1. Estado aprovado e referências

| Item | Estado atual |
|---|---|
| Repositório | `njanuzzi/portal4d` |
| Branch de trabalho | `ui/atlas-de-padroes` |
| Pull request | [#43](https://github.com/njanuzzi/portal4d/pull/43) — aberto contra `main` |
| Commit de referência | `155a7d2` — os ajustes visuais e de validação estão no commit anterior `b5c1575` |
| Prévia da Vercel | `https://portal4d-git-ui-atlas-de-padroes-njanuzzis-projects.vercel.app` |
| Produção | `main` e `www.nubiajanuzzi.com` permanecem sem merge desta entrega |
| Supabase | A migration `20260827180000_create_content_articles.sql` já foi aplicada manualmente no projeto Portal4D |
| Vercel | `SUPABASE_SERVICE_ROLE_KEY` e `VERCEL_CONTENT_DEPLOY_HOOK_URL` foram cadastradas como Secrets para Production e Preview; os valores não devem ser exibidos, modificados ou versionados |

> O ambiente Preview usa o mesmo projeto Supabase da aplicação. Por isso, não crie dados fictícios, pacientes falsos nem artigos “de teste”. Somente um artigo real, aprovado pela proprietária, pode validar persistência e publicação.

## 2. Escopo funcional aprovado

### Interface pública — Atlas de Padrões

A nova linguagem visual é um **editorialismo cartográfico contemporâneo**. A composição usa azul-petróleo profundo, superfícies creme, dourado como sinal de direção, serifada editorial para títulos e uma espinha de coordenadas que orienta a rolagem. Ela deve permanecer distinta das telas autenticadas da área de membros.

| Área pública | Decisão de implementação |
|---|---|
| Home `/` | Hero assimétrico, blocos de reconhecimento, Método, Percurso, prévia de Sobre, Biblioteca 4D, FAQ e Sessão de Avaliação. |
| Método | O Protocolo 4D é explicado por uma **espiral interativa** que representa exclusivamente: Detectar, Desacelerar, Decodificar e Direcionar. Não confundir a espiral com o atendimento. |
| Percurso | O acompanhamento usa um explorador independente de **seis etapas**: Diagnóstico, Regulação, Desbloqueio, Execução, Consolidação e Autonomia. Não repetir os quatro movimentos do método nessa área. |
| Instruções de interação | Manter visíveis as microinstruções: “Clique em um movimento da espiral para ler como ele atua.” e “Selecione uma etapa da rota para entender seu foco e sua pergunta-guia.” |
| Sobre `/sobre` | Página institucional da Núbia, com a foto original já existente, trajetória, formação, abordagem e chamada para a Sessão de Avaliação. A home mantém uma prévia curta. |
| Conteúdos `/conteudos` | Biblioteca pública como sucessora do Substack. Se não houver artigo publicado, mostrar estado editorial de início, sem inventar posts. |
| Artigo `/conteudos/:slug` | Renderizar artigo publicado, imagem de capa, metadados e HTML higienizado. |
| Substack | O Substack antigo foi retirado da experiência pública. A rota histórica `/blog` deve redirecionar para `/conteudos`. Não reintroduzir feed, link ou dependência do Substack. |

As imagens humanas editoriais ficam em `public/images/`. Elas são imagens de atmosfera e não representam pacientes reais, depoimentos ou resultados clínicos. A foto real da autora deve permanecer associada à seção Sobre; não a substitua por imagem gerada.

### Biblioteca 4D — gestão privada

A gestão de conteúdos deve continuar limitada ao papel `therapist`, por meio das rotas:

| Rota | Finalidade |
|---|---|
| `/gestao-conteudos` | Lista privada de artigos e estados de publicação. |
| `/gestao-conteudos/novo` | Criação de artigo pela terapeuta. |
| `/gestao-conteudos/:id` | Edição de artigo existente pela terapeuta. |

O editor é **Tiptap**, com HTML higienizado por DOMPurify. O upload de capa e de imagens do texto usa o bucket Supabase Storage `content-images`, limitado a JPG, PNG e WebP de até 5 MB. As políticas RLS e o bucket foram criados pela migration aplicada.

### Regras editoriais e de erro

Não permitir que mensagens cruas do PostgreSQL/Supabase apareçam para a terapeuta. Os seguintes limites devem ser checados antes de qualquer envio:

| Campo | Regra | Experiência esperada |
|---|---:|---|
| Título | 4–180 caracteres | Aviso simples antes de salvar. |
| Resumo | 20–360 caracteres | Mostrar contador e “faltam N caracteres”. O teste anterior falhou porque o resumo “Teste” tinha 5 caracteres. |
| Categoria | 2–80 caracteres | Aviso simples antes de salvar. |
| Conteúdo | Obrigatório | Explicar que o corpo do artigo precisa ser escrito. |
| Publicação | Capa, texto alternativo e descrição de busca obrigatórios | Rascunhos podem ser salvos sem esses itens; publicação não. |
| Imagem | JPG/PNG/WebP, até 5 MB | Bloquear arquivo incompatível antes do upload. |

Quando uma regra do banco ainda retornar erro, converta-a para linguagem compreensível. Exemplos: erro de `excerpt` vira “O resumo precisa ter entre 20 e 360 caracteres”; slug duplicado vira “Já existe um artigo com este endereço”; falha de RLS vira orientação para refazer a sessão de terapeuta.

## 3. Arquivos e responsabilidades

| Grupo | Arquivos principais | Responsabilidade |
|---|---|---|
| Rotas | `src/App.tsx` | Manter rotas públicas, privadas e redirecionamentos sem interferir em links de cliente por token. |
| Interface Atlas | `src/pages/MarketingHome.tsx`, `src/pages/Protocolo4D.tsx`, `src/pages/Atendimento.tsx`, `src/pages/About.tsx` | Interface pública, método e percurso. |
| Componentes Atlas | `src/components/marketing/AtlasSpiral.tsx`, `AtlasJourney.tsx`, `ContentPreview.tsx`, `MarketingHeader.tsx`, `MarketingDrawer.tsx`, `MarketingLayout.tsx`, `MarketingFooter.tsx` | Navegação e blocos interativos. |
| Estilos | `src/styles/atlas.css`, `src/index.css`, `tailwind.config.js`, `index.html` | Design tokens e fontes, isolados das interfaces privadas. |
| Biblioteca pública | `src/pages/Contents.tsx`, `src/pages/ContentArticle.tsx`, `src/components/SeoHead.tsx` | Lista, artigo e SEO por conteúdo. |
| Biblioteca privada | `src/pages/therapist/ContentManager.tsx`, `ContentEditor.tsx`, `src/components/content/RichTextEditor.tsx` | Tiptap, validação e gestão com papel de terapeuta. |
| Dados de conteúdo | `src/lib/content.ts`, `src/lib/database.types.ts` | Sanitização, dados, slug, upload e chamadas à publicação. |
| Infraestrutura | `supabase/migrations/20260827180000_create_content_articles.sql`, `api/sitemap.ts`, `api/trigger-content-build.ts`, `scripts/prerender-contents.mjs`, `vercel.json`, `public/robots.txt` | Banco, sitemap, acionamento de build e rastreamento. |

## 4. SEO e publicação de artigos

A Biblioteca precisa oferecer conteúdo renderizável para mecanismos de busca e compartilhamento. Preserve o seguinte fluxo:

1. A terapeuta salva rascunho ou publica artigo na área privada.
2. A publicação valida os requisitos editoriais, higieniza o HTML e grava apenas para o usuário com papel `therapist`.
3. Quando o status muda para `published`, a função `api/trigger-content-build.ts` valida a sessão no servidor e chama o Deploy Hook da Vercel.
4. O build executa `scripts/prerender-contents.mjs` para disponibilizar os artigos e metadados de busca na build.
5. O endpoint `api/sitemap.ts` inclui URLs de conteúdos publicados, e `public/robots.txt` referencia o sitemap público.

Não exponha nem importe `SUPABASE_SERVICE_ROLE_KEY` no cliente. Variáveis públicas do Supabase existentes podem ser utilizadas apenas como `VITE_*` já aprovadas para o frontend. Antes de qualquer alteração nos endpoints, valide autenticação, RLS e ausência de vazamento de secrets.

### Cuidado necessário com Preview

O hook existente está associado à branch `main`, como deve ser para publicação final. Assim, **não publique artigo real a partir da prévia enquanto a nova UI não tiver sido integrada à `main`**: um publish na prévia pode acionar uma build de `main`.

Se for indispensável testar o fluxo de publicação antes do merge, crie na Vercel um **segundo Deploy Hook exclusivo da branch `ui/atlas-de-padroes`** e defina uma versão de `VERCEL_CONTENT_DEPLOY_HOOK_URL` apenas para o ambiente Preview. Preserve a variável Production apontando para o hook de `main`. Essa configuração deve ser feita no painel seguro da Vercel, sem registrar URLs no Git.

## 5. Processo obrigatório de revisão

### Antes de modificar

1. Faça inventário de mudanças concorrentes em `origin/main` e `ui/atlas-de-padroes`.
2. Leia `implementation_notes.md`, `docs/publicacao-biblioteca-4d.md` e este documento.
3. Confirme que os seguintes fluxos não sofrerão regressão: login, áreas Cliente/Terapeuta, links de acesso por token, questionário, agendamento, e-mail, ManyChat, push e relatórios.
4. Não altere migrations existentes. A migration de conteúdos já foi aplicada; qualquer mudança de schema futura exige migration nova, reversível e previamente aprovada.

### Antes de propor merge

| Verificação | Critério de aceite |
|---|---|
| Build | `npm run build` conclui com sucesso. Registre avisos preexistentes separadamente. |
| Home pública | Método e Percurso funcionam de forma independente, com instruções de clique visíveis. |
| Navegação | Header, menu móvel e rodapé levam para Método, Atendimento, Conteúdos, Sobre e Área de membros. |
| Blog | `/conteudos`, `/conteudos/:slug`, `/blog`, `/robots.txt` e `/sitemap.xml` respondem como esperado. |
| Permissões | Visitante não acessa gestão; terapeuta acessa somente as rotas editoriais previstas. |
| Editor | Resumo curto é bloqueado localmente com mensagem amigável, sem erro bruto de banco. |
| Segurança | Nenhum secret aparece em código, logs, screenshots, mensagens de erro ou commits. |
| Dados | Nenhum paciente, artigo fictício, avaliação, depoimento ou dado clínico é criado para testes. |
| Dispositivos | Registrar verificação desktop e mobile da home, Sobre e Biblioteca. |

> A proprietária precisa revisar visualmente a URL de Preview e aprovar explicitamente antes de qualquer merge. Não assuma aprovação pelo fato de o deploy estar verde.

## 6. Entrega esperada do Claude Code

Ao concluir sua revisão ou correção, responda com um resumo objetivo em formato de tabela: arquivos alterados, motivo de cada alteração, testes executados, limitações conhecidas, URL de Preview, status do pull request e confirmação explícita de que `main` não foi alterada. Inclua também quaisquer conflitos com mudanças concorrentes do Claude/usuária e recomende o próximo passo mais seguro.

Não inclua chaves, URLs de Deploy Hook, dados pessoais, dados clínicos, conteúdo fictício, avaliações ou depoimentos inventados no relatório.

---

## Anexos e leituras obrigatórias

1. `implementation_notes.md` — registro das validações e das decisões tomadas.
2. `docs/publicacao-biblioteca-4d.md` — operação da Biblioteca depois do merge.
3. `supabase/migrations/20260827180000_create_content_articles.sql` — schema aplicado; usar apenas como referência, não reaplicar.
4. `todo.md` — pendências editoriais e de validação real do primeiro artigo.
