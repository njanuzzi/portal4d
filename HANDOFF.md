# Portal4D / Núbia Januzzi — Documento de Handoff para Desenvolvedor

> **Versão:** 1.0
> **Data:** 2026-08-06
> **Autor:** Claude (Anthropic), em conjunto com Núbia Januzzi
> **Objetivo deste documento:** dar a um desenvolvedor contratado uma visão completa do produto — o que ele é, para quem, como foi construído, o que está pronto, o que está pendente e onde encontrar cada coisa.

Este documento substitui `TECHNICAL.md` e `TECHNICAL_V2.md` como referência principal — eles ficam no repositório como histórico, mas alguns pontos neles (principalmente em `TECHNICAL_V2.md`) descreviam um plano que mudou depois de implementado. Aqui, tudo foi conferido contra o código e o banco de dados reais em 2026-08-06.

---

## Sumário

1. [O que é o produto](#1-o-que-é-o-produto)
2. [Nomenclatura — atenção](#2-nomenclatura--atenção)
3. [Identidade visual (branding)](#3-identidade-visual-branding)
4. [Contas e acessos](#4-contas-e-acessos)
5. [Stack técnica](#5-stack-técnica)
6. [Mapa de módulos](#6-mapa-de-módulos)
7. [Módulo A — App principal (terapeuta + cliente)](#7-módulo-a--app-principal-terapeuta--cliente)
8. [Módulo B — Automação WhatsApp](#8-módulo-b--automação-whatsapp)
9. [Módulo C — Agendamento manual (Scheduling)](#9-módulo-c--agendamento-manual-scheduling)
10. [Módulo D — Notificações push](#10-módulo-d--notificações-push)
11. [Módulo E — Site público + chatbot (o mais novo)](#11-módulo-e--site-público--chatbot-o-mais-novo)
12. [Tabelas no banco que NÃO são deste produto](#12-tabelas-no-banco-que-não-são-deste-produto)
13. [Deploy e ambientes](#13-deploy-e-ambientes)
14. [Estado atual — o que falta para cada módulo ir ao ar](#14-estado-atual--o-que-falta-para-cada-módulo-ir-ao-ar)
15. [Problemas conhecidos e decisões técnicas](#15-problemas-conhecidos-e-decisões-técnicas)

---

## 1. O que é o produto

Um portal privado de acompanhamento terapêutico construído para a psicoterapeuta **Núbia Januzzi**, para uso com as próprias clientes. Dois papéis:

- **Terapeuta**: cadastra clientes, monta diários estruturados (perguntas configuráveis), acompanha o preenchimento, escreve e publica relatórios clínicos, e usa duas ferramentas de contato em massa por WhatsApp (uma manual, uma semi-automatizada).
- **Cliente**: preenche um diário diário (perguntas de texto, número, escala 1-10 ou emoções), faz anotações livres ao longo do dia, define metas semanais, e lê os relatórios que a terapeuta publica para ela.

Além do app logado, está em construção um **site público** (a "vitrine" — apresentação da terapeuta, do método, e porta de entrada para virar cliente) e um **chatbot de apoio** dentro da área do cliente logado — ambos descritos na seção 11, são o trabalho mais recente e ainda não estão publicados.

---

## 2. Nomenclatura — atenção

**Definido (2026-08-06): existem três camadas distintas, não um nome único** — importante o desenvolvedor não achatar isso em uma coisa só:

| Camada | Nome | O que é | Onde aparece |
|---|---|---|---|
| **Marca pessoal** | **Núbia Januzzi** | A marca é a terapeuta, não o software — mesmo padrão do site de referência analisado no início do projeto (drsauloverissimo.com), onde a marca é o profissional, não o método | Header e "Sobre" do site público, rodapé (`© Núbia Januzzi`) |
| **Produto/método clínico** | **Protocolo 4D** | Um produto à parte, criado por ela — a metodologia (Detectar, Desacelerar, Decodificar, Direcionar) que ela vende/aplica. Não é o nome da empresa nem do software | Hero e seção de método do site público, posicionado como "criação" dela, não como a marca em si |
| **Plataforma/software** | **Portal 4D - Desbloqueio Comportamental** | O nome do sistema — a ferramenta onde clientes preenchem diário e acessam relatórios | Tela de login, cabeçalho da área do cliente, `CLAUDE.md`, nome do repositório |
| ~~Portal Nubii~~ | — | Descartado, não usar | Só existia como rascunho de briefing |

A estrutura atual do `MarketingHome.tsx` já segue essa hierarquia razoavelmente bem — nome da terapeuta em destaque no header, "Psicoterapeuta · Criadora do Protocolo 4D" no hero (posicionando o Protocolo como criação dela, não como a marca), "Portal 4D" citado como a plataforma na seção Sobre. Não é necessário reescrever do zero, mas vale uma revisão de copy com esse vocabulário claro antes de publicar.

---

## 3. Identidade visual (branding)

Definida em `tailwind.config.js` e usada consistentemente em toda a UI logada e no novo site público.

### Paleta

| Token | Hex principal | Uso |
|---|---|---|
| `petrol-700` | `#1B4B5A` | Cor primária — headers, botões primários, fundo do hero |
| `gold-500` | `#C9A84C` | Acento — CTAs secundários, destaques, ícones sobre fundo escuro |
| `beige-200` | `#F4EDE0` | Fundo de página |
| `dark` | `#2C2C2C` | Texto principal |

Cada uma tem uma escala completa 50–900 no `tailwind.config.js` (ex.: `petrol-50` a `petrol-900`).

### Tipografia

- **Serif (títulos):** Playfair Display — carregada via Google Fonts, usada em `h1`/`h2` e destaques editoriais.
- **Sans (corpo):** Inter — texto corrido, formulários, navegação.

> Nota: a tela de `Login.tsx` usa `'DM Sans'` via inline styles em vez de Inter/Tailwind — é uma inconsistência herdada, não um terceiro padrão intencional. Vale unificar.

### Logo

`public/logosistema.png` — usado no header do login, da área do cliente e do novo site público.

### Tom de voz

Direto, clínico, sem jargão motivacional — evidente no copy do site público ("O que se repete em você não é falta de esforço. É um padrão que ainda não foi nomeado.") e na estrutura do método (4 verbos de ação: Detectar, Desacelerar, Decodificar, Direcionar).

---

## 4. Contas e acessos

| Serviço | Conta | Observações |
|---|---|---|
| GitHub (código) | `njanuzzi` | Repositório `njanuzzi/portal4d`, branch `main` |
| Vercel (deploy) | `njanuzzis-projects` | Projeto `portal4d`, deploy automático a cada push em `main` |
| Supabase (banco + auth) | `nubiascjanuzzi@gmail.com` via GitHub OAuth | Projeto `Portal4D`, ID `ojmaxsskczukdbxpaull` |
| Terapeuta (dentro do app) | `nubiajanuzzicontato@gmail.com` | Login como `role = 'therapist'` |
| Vercel AI Gateway | Mesma conta Vercel | **Pendente**: requer cartão de crédito cadastrado para liberar uso (ver seção 14) |
| E-mail transacional | ZeptoMail | `smtp.zeptomail.com:587`, usado pelo Supabase Auth para e-mails de convite/redefinição de senha |
| WhatsApp Business (Meta) | Ver seção 8 | Número dedicado + System User na Meta Business Suite |

---

## 5. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Roteamento | React Router DOM v7 (client-side, sem framework SSR) |
| Estilo | Tailwind CSS 3.4 |
| Ícones | `lucide-react` — biblioteca única, não misturar outras |
| Backend / banco | Supabase (PostgreSQL + Auth + Row Level Security + Edge Functions em Deno) |
| Serverless adicional | Vercel Functions (Node.js) — usado só pelo módulo de chatbot (seção 11) |
| IA | Vercel AI SDK (`ai`, `@ai-sdk/react`) + Vercel AI Gateway → modelos Anthropic (Claude) |
| Hospedagem | Vercel, deploy automático via push no GitHub |
| E-mail | ZeptoMail (via configuração SMTP do Supabase Auth) |

Não há testes automatizados configurados no projeto.

---

## 6. Mapa de módulos

O produto, hoje, é a soma de cinco módulos construídos em momentos diferentes — mais duas tabelas no mesmo banco que **não pertencem a este produto** (seção 12). Cada um está descrito em sua própria seção abaixo, com o que existe, onde está o código, e o estado (em produção / pronto mas não publicado / parcial).

| Módulo | Estado | Seção |
|---|---|---|
| A — App principal (diário, relatórios, metas) | Em produção | 7 |
| B — Automação WhatsApp (lembretes automáticos) | Em produção, parcial | 8 |
| C — Agendamento manual (envio em massa de link de agenda) | Em produção | 9 |
| D — Notificações push | Em produção | 10 |
| E — Site público + chatbot | **Não publicado ainda** | 11 |

---

## 7. Módulo A — App principal (terapeuta + cliente)

### Banco de dados

| Tabela | Linhas hoje | Propósito |
|---|---|---|
| `profiles` | 5 | Um por usuário (`role`: `therapist` ou `client`), espelha `auth.users` via trigger |
| `diaries` | 2 | Templates de diário; só um `is_active = true` por vez (trigger garante isso) |
| `diary_questions` | 11 | Perguntas de cada diário — coluna é `order_num` no TS mas `"order"` no SQL (palavra reservada) |
| `diary_entries` | 11 | Um registro por cliente por dia (`UNIQUE(user_id, date)`) |
| `entry_answers` | 101 | Respostas de cada pergunta em cada registro |
| `day_notes` | 11 | Anotações livres do cliente ao longo do dia, com emoções + intensidade |
| `reports` | 0 | Relatórios clínicos em HTML sanitizado (DOMPurify), com flag `published` |
| `client_tokens` | 0 | Tokens de acesso sem login (`/client/:token`) |
| `client_invites` | 6 | Histórico de convites por e-mail |
| `client_goals` | 2 | Metas semanais de "desbloqueio", ciclo de 7 registros |

RLS habilitado em todas — terapeuta lê/escreve tudo, cliente só acessa os próprios dados (e relatórios só se `published = true`). Detalhe importante: as políticas usam a claim de role do JWT (`auth.jwt()->'user_metadata'->>'role'`), não mais uma subquery em `profiles`, porque a subquery causava um loop de recursão no login — isso já foi corrigido e não deve ser revertido.

### Autenticação

Dois caminhos de acesso do cliente, que **não compartilham sessão**:
1. **Login normal** (`/login` → Supabase Auth com email/senha) — é o que o resto deste documento chama de "cliente logado".
2. **Acesso por token** (`/client/:token`, link de convite avulso) — não usa Supabase Auth, guarda `{ token, client_id }` no `localStorage`. Um cliente nesse fluxo **não tem `auth.uid()`**, então nenhuma política de RLS baseada em `auth.uid()` se aplica a ele — o acesso é feito por RPCs `SECURITY DEFINER` que revalidam o token manualmente.

### Onde está o código

```
src/
├── App.tsx                        # Roteamento raiz + guards por role
├── contexts/AuthContext.tsx       # user, session, profile, signIn/signOut
├── lib/
│   ├── database.types.ts          # Tipos gerados do banco (⚠️ ver seção 15 — desatualizados em vários pontos)
│   └── supabase.ts                # Client Supabase singleton
├── components/
│   ├── layout/TherapistLayout.tsx
│   ├── layout/ClientLayout.tsx
│   └── ui/                        # Button, Card, Input, Modal, etc — usar estes, não HTML cru
└── pages/
    ├── Login.tsx, ResetPassword.tsx, PrivacyPolicy.tsx
    ├── therapist/                 # Dashboard, Clients, Diaries, Reports, ClientDetail, etc.
    └── client/                    # ClientHome, DiaryPage, DiaryHistory, ClientReports, ClientAccess
```

Rotas completas (terapeuta e cliente) estão listadas em `TECHNICAL.md`, seção 10 — ainda precisas, não repito aqui.

---

## 8. Módulo B — Automação WhatsApp

**O que faz:** depois que o cliente manda "Iniciar" pelo WhatsApp num link que a terapeuta envia, o sistema conversa por palavras-chave fixas (não é IA) para ativar lembretes diários automáticos de preenchimento do diário.

### Como foi construído (diferente do que `TECHNICAL_V2.md` planejava)

O plano original (`TECHNICAL_V2.md`) previa só uma Edge Function recebendo webhooks diretos da Meta Cloud API. **Na prática, existem duas Edge Functions paralelas hoje**, porque o fluxo de envio foi migrado para passar pelo **ManyChat** como intermediário:

| Edge Function | Recebe de | Status |
|---|---|---|
| `whatsapp-webhook` | Webhook direto da Meta Cloud API | Ativa (v26 — bastante iterada, inclui lógica extra de casar número de telefone com/sem o dígito 9 do DDD brasileiro) |
| `whatsapp-manychat-webhook` | Webhook do ManyChat (que por sua vez fala com a Meta) | Ativa (v2, mais nova) |
| `whatsapp-send-reminder` | Disparada por `pg_cron` diariamente | Ativa |
| `whatsapp-send-invite` | Ação da terapeuta no portal (`ClientDetail`) | Ativa |

**Confirmar com quem mantém isso hoje se o fluxo em uso é via ManyChat ou via webhook direto da Meta** — os dois estão ativos no Supabase, o que sugere uma migração em andamento ou os dois em paralelo por segurança. Vale esclarecer antes de o novo desenvolvedor mexer em qualquer um dos dois.

### Palavras-chave reconhecidas

`Iniciar` → `Entendi` / `Não entendi` → lembretes diários → `Respondi`. Tabela completa de mensagens em `supabase/functions/_shared/messages.ts`.

### Tabelas

- `whatsapp_sessions` (1 linha) — estado por cliente: `pending` / `active` / `paused`, janela de 24h (`last_message_at`) exigida pela política da Meta para mensagens não-template.
- `whatsapp_logs` (14 linhas) — histórico de mensagens enviadas/recebidas.
- `bot_conversations` (**0 linhas, tabela existe mas não é escrita por nenhuma das Edge Functions atuais**) — parece um esboço para um bot conversacional (colunas `role: user/assistant`, como um chat de IA) que nunca chegou a ser conectado. Não confundir com o chatbot novo do Módulo E, que é peça completamente separada.

### Agendamento

`pg_cron` dispara `whatsapp-send-reminder` diariamente às 18h UTC (15h de Brasília) — configuração está descrita em `TECHNICAL_V2.md`, seção 8, ainda válida.

---

## 9. Módulo C — Agendamento manual (Scheduling)

**O que faz:** ferramenta para a terapeuta mandar, todo mês, uma mensagem em massa pelo WhatsApp pessoal dela (não pela API da Meta) pedindo pra clientes reservarem horário. É manual — copia números e mensagem, ou abre `wa.me` um por um — não é automação de servidor.

- Página: `src/pages/therapist/Scheduling.tsx`.
- Tabela: `scheduling_contacts` (10 linhas) — lista de contatos do agendamento, por terapeuta (`therapist_id`).
- A mensagem-modelo fica salva no `localStorage` do navegador (`scheduling_message_template`), com autosave — **não é compartilhada entre dispositivos**, é local de cada navegador.
- Suporta seleção múltipla de contatos e envio em lote (adicionado nos commits mais recentes do repositório).

---

## 10. Módulo D — Notificações push

Web Push padrão (VAPID), não é notificação nativa de app.

- Hook: `src/hooks/usePushNotifications.ts` — chamado uma vez pelo `ClientLayout` para cada cliente logado; pede permissão do navegador, registra `public/sw.js` como service worker, salva a subscription em `push_subscriptions`.
- Edge Function `send-push-notifications` dispara os pushes (não lida no detalhe para este documento — ler `supabase/functions/` se precisar alterar o conteúdo das notificações).
- Env var: `VITE_VAPID_PUBLIC_KEY`.

---

## 11. Módulo E — Site público + chatbot (o mais novo)

Construído em 2026-08-06, ainda **não publicado** — código já commitado em `main`, mas falta configurar o AI Gateway (cartão de crédito), revisar copy, e apontar um domínio próprio antes de ir ao ar. Ver seção 14.

**Domínio-alvo:** `www.nubiajanuzzi.com` (decisão da Núbia) — ainda não configurado no Vercel nem no DNS, ver seção 14.

### 11.1 Arquitetura de páginas públicas

| Rota | Página | Conteúdo |
|---|---|---|
| `/` | `src/pages/MarketingHome.tsx` | Home — hero, teaser dos 4 pilares do Protocolo 4D (com link "saiba mais"), bio da Núbia, bloco de conteúdo (Instagram), CTA de contato (WhatsApp) |
| `/protocolo4d` | `src/pages/Protocolo4D.tsx` | Explicação completa do método, uma etapa por vez |
| `/areamembros` | `src/pages/Login.tsx` (reaproveitada) | Login — mesma tela de sempre (abas Terapeuta/Cliente), nenhum sistema de auth novo. **`/login` continua funcionando como redirecionamento** para `/areamembros`, por segurança, mas não é mais o caminho canônico. |

- Header e footer compartilhados entre as páginas públicas: `src/components/marketing/MarketingHeader.tsx` (menu com "Início" / "Protocolo 4D" / botão "Área de Membros", com versão mobile em hambúrguer) e `MarketingFooter.tsx`.
- `src/App.tsx` serve `/` e `/areamembros` **só para visitantes deslogados** — clientes/terapeutas já autenticados continuam caindo direto no próprio painel, como sempre. `/protocolo4d` é público sempre (mesmo padrão de `/privacy`), independente de estar logado.
- Conteúdo dos 4 pilares do Protocolo 4D está centralizado em `src/lib/protocolo4d.ts` — usado tanto na Home (versão curta) quanto em `/protocolo4d` (versão longa, com `detalhe`). Editar ali atualiza as duas páginas.
- **Ainda planejado, não construído:** um "teste rápido" nos moldes do Mapa dos Contornos do site de referência (drsauloverissimo.com) — Núbia ainda vai definir o formato exato antes de entrar no escopo.
- **Placeholders que precisam de dado real antes de publicar:** link do Instagram, número de WhatsApp (`https://wa.me/`, hoje vazio), texto exato da bio/credenciais — todos marcados com `// TODO` no código.

### 11.2 Chatbot de apoio (clientes logados)

Um assistente de conversa, visível como botão flutuante em todas as páginas do cliente logado (`/home`, `/diary`, `/diary/history`, `/reports`, `/change-password`).

**Escopo funcional (decidido com a Núbia):** apoio entre sessões, reflexão guiada sobre a entrada de diário do dia, e dúvidas administrativas do portal. Não substitui atendimento clínico — o system prompt instrui o modelo a nunca diagnosticar e a orientar contato direto com a terapeuta (ou CVV/emergência) em qualquer sinal de risco.

**Arquitetura:**
```
Cliente logado (browser)
  └─ ClientChatbot.tsx (botão + painel de chat, usa useChat do @ai-sdk/react)
       └─ POST /api/chat  (Vercel Function, Node.js, streaming)
             ├─ valida o token de sessão do cliente (Authorization: Bearer)
             ├─ cria um client Supabase COM esse token (nunca a service role key)
             │    → RLS já existente restringe automaticamente a dados do próprio cliente
             ├─ busca a entrada de diário de HOJE (se existir)
             └─ streamText() via Vercel AI Gateway, modelo anthropic/claude-haiku-4.5
```

- Arquivo do backend: `api/chat.ts` (na raiz do repo, não em `src/` — é uma Vercel Function, não faz parte do bundle Vite).
- Arquivo do frontend: `src/components/client/ClientChatbot.tsx`, montado uma vez em `src/components/layout/ClientLayout.tsx`.
- **O histórico da conversa não é salvo em banco hoje** — vive só no estado do React; se o cliente recarregar a página, perde o histórico. Se quiserem persistência, é trabalho adicional (uma tabela nova, sem relação com `bot_conversations` do Módulo B).
- **Só funciona com clientes autenticados via Supabase Auth** (login normal) — o fluxo de token avulso (`/client/:token`) não tem sessão real, então fica fora do escopo do chatbot por design.

### 11.3 O que precisa para publicar

Ver seção 14 (é o item mais urgente da lista).

---

## 12. Tabelas no banco que NÃO são deste produto

O projeto Supabase (`ojmaxsskczukdbxpaull`) também hospeda tabelas de um uso pessoal não relacionado ao Portal4D — **importante o desenvolvedor saber que elas existem para não tentar integrá-las por engano**:

- `financas_lancamentos`, `financas_saldo`, `financas_metas`, `financas_limites` — controle financeiro pessoal (coluna `pessoa` restrita a `'nu'`/`'vi'`), sem nenhuma tela no app React. Provavelmente alimentado por outro cliente/bot fora deste repositório.

Se não forem mais necessárias, considerar mover para um projeto Supabase separado — hoje elas convivem no mesmo banco do produto de terapia, o que não é ideal para isolamento de dados.

---

## 13. Deploy e ambientes

- **Deploy:** push em `main` no GitHub → Vercel builda (`npm run build`, Vite) e publica automaticamente. Sem staging/preview formalizado além do preview automático de PR da própria Vercel.
- **`vercel.json`:** faz rewrite de SPA (`/(.*) → /index.html`, exceto `/api/*`, que agora tem prioridade por causa do chatbot) + headers de cache (`index.html` sem cache, `/assets/*` imutável).
- **Variáveis de ambiente** (Vercel dashboard, Settings → Environment Variables):

| Variável | Ambientes configurados hoje |
|---|---|
| `VITE_SUPABASE_URL` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview |
| `VITE_APP_URL` | Production |
| `VITE_VAPID_PUBLIC_KEY` | Production |

> Nenhuma está configurada para o ambiente **Development** — rodar localmente depende do `.env`/`.env.local` do repositório (não versionados, já existem na máquina da Núbia).

- **Comandos locais:**
```bash
npm run dev         # servidor de desenvolvimento (Vite) — não roda /api/*
vercel dev           # mesmo servidor + Vercel Functions (necessário para testar o chatbot localmente)
npm run typecheck
npm run lint
npm run build
```

---

## 14. Estado atual — o que falta para cada módulo ir ao ar

| Item | Bloqueia o quê | Ação necessária |
|---|---|---|
| **Cartão de crédito no AI Gateway da Vercel** | Chatbot (Módulo E) — testado e retorna `customer_verification_required` até isso ser feito | Núbia cadastra um cartão em vercel.com → AI Gateway (libera créditos gratuitos, não é cobrança automática de uso) |
| **Domínio `www.nubiajanuzzi.com`** | Publicar o site (Módulo E) com URL final | Comprar/confirmar o domínio, apontar DNS pro Vercel, adicionar como domínio do projeto no dashboard |
| **Copy de placeholder no site público** | Publicar o site (Módulo E) | Revisar/substituir: link do Instagram, número do WhatsApp, texto da bio/credenciais em `MarketingHome.tsx` |
| **"Teste rápido" (tipo Mapa dos Contornos)** | Módulo E — funcionalidade planejada, ainda sem formato definido | Núbia vai definir o formato; depois disso, escopar como nova rota pública + lead capture |
| **Ambíguidade webhook direto vs ManyChat** | Manutenção segura do Módulo B | Confirmar qual dos dois webhooks está realmente recebendo tráfego da Meta hoje |
| **`bot_conversations` sem uso** | Nada — é só uma tabela órfã | Decidir se remove ou se era planejada pra algo específico |
| **Tabelas `financas_*`** | Higiene de dados | Avaliar mover para um projeto Supabase separado |
| **Persistência do histórico do chatbot** | Nada hoje, é opcional | Construir se quiserem que a conversa sobreviva a um refresh de página |

---

## 15. Problemas conhecidos e decisões técnicas

Herdados de `TECHNICAL.md` (ainda válidos, confirmados no código atual):

| Problema / decisão | Detalhe |
|---|---|
| `database.types.ts` desatualizado | Gera vários erros de tipo `never` no `typecheck` em páginas do terapeuta (`Dashboard.tsx`, `Diaries.tsx`, `NewClient.tsx` etc.) — pré-existente, não bloqueia build, mas vale regenerar os tipos a partir do schema real do Supabase |
| Coluna `"order"` vs `order_num` | O SQL usa `"order"` (aspas, por ser palavra reservada); o TypeScript chama de `order_num`. Selects precisam usar o nome real da coluna SQL |
| `.catch()` não existe em `PostgrestBuilder` | Usar `.then(onFulfilled, onRejected)` em vez de `.catch()` em chamadas `.rpc()` do Supabase — `.catch()` direto derruba a página |
| RLS com subquery em `profiles` causava loop | Políticas hoje usam a claim de role do JWT, não mais subquery — não reverter esse padrão |
| `VITE_APP_URL` crítico para e-mails | Links de convite/redefinição de senha usam essa env var — se faltar, apontam para `localhost` em vez de produção |
| Filtro de `day_notes` por data local | `noted_at` é salvo em UTC; para filtrar por dia local, converter os limites do dia com `new Date(`${date}T00:00:00`).toISOString()` |

---

## Onde procurar mais detalhe

- Schema completo, RPCs e histórico de migrations do Módulo A: `TECHNICAL.md` (ainda preciso para esses tópicos).
- Fluxo detalhado, mensagens do sistema e plano original do Módulo B: `TECHNICAL_V2.md` (ler com a ressalva da seção 8 deste documento — o "como foi construído" diverge do "como foi planejado" em alguns pontos).
- Módulo E (site público + chatbot): código-fonte é a referência — `src/pages/MarketingHome.tsx`, `src/components/client/ClientChatbot.tsx` e `api/chat.ts`, todos com comentários no ponto onde há decisão de design relevante.
