# Ativação da Biblioteca 4D

Este documento acompanha a branch `ui/atlas-de-padroes`. A nova UI pública, as rotas da Biblioteca e o painel de gestão estão no código, mas a publicação de artigos depende de uma migration do Supabase e de duas configurações de ambiente na Vercel.

## Sequência segura

| Ordem | Ação | Resultado esperado |
|---|---|---|
| 1 | Aplicar a migration `20260827180000_create_content_articles.sql` no projeto Supabase atual | Cria a tabela `content_articles`, o bucket `content-images` e as políticas de acesso. |
| 2 | Abrir a prévia da Vercel criada pela branch e entrar como terapeuta | A navegação lateral passa a exibir **Biblioteca 4D**. |
| 3 | Criar um rascunho em `/gestao-conteudos` | O rascunho fica visível apenas para a terapeuta. |
| 4 | Publicar o primeiro artigo com capa, texto alternativo e descrição de busca | O artigo entra na Biblioteca e pode acionar uma nova build. |
| 5 | Conferir `/conteudos/:slug`, `/sitemap.xml` e `/robots.txt` na prévia | Confirma conteúdo público, metadados e rastreamento. |
| 6 | Aprovar a prévia e integrar a branch na `main` | Somente então a Vercel atualiza `nubiajanuzzi.com`. |

## Variáveis de ambiente na Vercel

As variáveis de ambiente já existentes do Supabase devem continuar configuradas. Para atualizar páginas pré-geradas sempre que um artigo for publicado, acrescente as seguintes variáveis **no ambiente de Preview e Production**, sem registrar seus valores no Git:

| Variável | Finalidade |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Permite que a função `/api/trigger-content-build` valide o papel de terapeuta no servidor. Nunca deve ser exposta no frontend. |
| `VERCEL_CONTENT_DEPLOY_HOOK_URL` | URL de um Deploy Hook da Vercel direcionado à branch `main`. A função a chama após uma publicação ou retirada de artigo. |

> A chave `SUPABASE_SERVICE_ROLE_KEY` é segredo de servidor. Não use o prefixo `VITE_` e não a coloque em arquivos do repositório.

## Comportamento sem Deploy Hook

O artigo continuará salvo e público pelo Supabase, mas uma nova versão estática para mecanismos de busca só será criada no próximo deploy normal. A interface informa essa situação, sem perder o conteúdo.

## Pontos de validação

Antes de integrar a branch, confirme que os fluxos existentes de login, links com token de cliente, Push, ManyChat, e-mail, agendamento e questionário continuam operando. A migração desta branch não modifica nenhuma tabela ou rota privada já existente.
