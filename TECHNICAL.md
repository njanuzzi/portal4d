# Portal D4 — Documentação Técnica

> **Versão:** 1.0  
> **Última atualização:** 2026-05-06  
> **Projeto:** Desbloqueio Comportamental — Portal de acompanhamento terapêutico  
> **Responsável técnico:** Claude (Anthropic) + Núbia Januzzi

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Variáveis de Ambiente](#3-variáveis-de-ambiente)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Banco de Dados — Esquema Completo](#5-banco-de-dados--esquema-completo)
6. [RPCs / Funções PostgreSQL](#6-rpcs--funções-postgresql)
7. [Row Level Security (RLS)](#7-row-level-security-rls)
8. [Histórico de Migrations](#8-histórico-de-migrations)
9. [Autenticação e Autorização](#9-autenticação-e-autorização)
10. [Roteamento Frontend](#10-roteamento-frontend)
11. [Páginas — Terapeuta](#11-páginas--terapeuta)
12. [Páginas — Cliente](#12-páginas--cliente)
13. [Componentes UI](#13-componentes-ui)
14. [Bibliotecas Utilitárias](#14-bibliotecas-utilitárias)
15. [Funcionalidades Principais](#15-funcionalidades-principais)
16. [Deploy e CI/CD](#16-deploy-e-cicd)
17. [Decisões Técnicas Importantes](#17-decisões-técnicas-importantes)
18. [Problemas Conhecidos e Soluções Aplicadas](#18-problemas-conhecidos-e-soluções-aplicadas)

---

## 1. Visão Geral

Portal web para a psicoterapeuta **Núbia Januzzi**, especialista em Desbloqueio Comportamental. Permite:

- **Terapeuta**: gerenciar clientes, criar diários estruturados, acompanhar registros e anotações, escrever relatórios clínicos com suporte de IA.
- **Cliente**: preencher diário diário com perguntas estruturadas, fazer anotações livres com registro de emoções, definir metas semanais de desbloqueio e acessar relatórios publicados pela terapeuta.

O sistema é **multi-tenant por cliente** — cada cliente vê apenas seus próprios dados, o diário ativo e os relatórios publicados para ele.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React | 18.3.1 |
| Linguagem | TypeScript | 5.5.3 |
| Build | Vite | 5.4.2 |
| Roteamento | React Router DOM | 7.14.2 |
| Estilo | Tailwind CSS | 3.4.1 |
| Ícones | Lucide React | 0.344.0 |
| Backend / BaaS | Supabase (PostgreSQL + Auth + RLS) | supabase-js 2.57.4 |
| Hospedagem | Vercel (deploy automático via GitHub) | — |
| E-mail transacional | ZeptoMail (smtp.zeptomail.com, porta 587) | — |
| Sanitização HTML | DOMPurify | 3.4.2 |

---

## 3. Variáveis de Ambiente

Configuradas no painel Vercel (Settings → Environment Variables). Para desenvolvimento local, criar `.env.local`:

```env
VITE_SUPABASE_URL=https://ojmaxsskczukdbxpaull.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_do_supabase>
VITE_APP_URL=https://portal4d.vercel.app
```

> ⚠️ `VITE_APP_URL` é crítico para que links de convite/redefinição de senha enviados por e-mail apontem para produção e não para `localhost`.

---

## 4. Estrutura de Pastas

```
portal4d/
├── public/
│   └── logosistema.png          # Logotipo do sistema
├── src/
│   ├── App.tsx                  # Roteamento raiz + guards de autenticação
│   ├── main.tsx                 # Entry point React
│   ├── index.css                # Tailwind base + custom classes
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Contexto global de autenticação
│   │
│   ├── lib/
│   │   ├── database.types.ts    # Tipos TypeScript do banco
│   │   ├── supabase.ts          # Cliente Supabase + helpers de URL
│   │   └── format.ts            # Funções de formatação de data/hora
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ClientLayout.tsx    # Layout + nav cliente (chama record_client_login)
│   │   │   └── TherapistLayout.tsx # Layout + nav terapeuta
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── ScaleInput.tsx
│   │       ├── Spinner.tsx
│   │       └── Textarea.tsx
│   │
│   └── pages/
│       ├── Login.tsx            # Login terapeuta/cliente + recuperação de senha
│       ├── ResetPassword.tsx    # Redefinição via link de e-mail
│       ├── therapist/
│       │   ├── Dashboard.tsx
│       │   ├── Clients.tsx
│       │   ├── NewClient.tsx
│       │   ├── ClientDetail.tsx
│       │   ├── ClientEntries.tsx
│       │   ├── ClientReports.tsx
│       │   ├── NewReport.tsx
│       │   ├── EditReport.tsx
│       │   ├── Diaries.tsx
│       │   ├── NewDiary.tsx
│       │   ├── DiaryDetail.tsx
│       │   ├── Reports.tsx
│       │   └── ReportsByClient.tsx
│       └── client/
│           ├── ClientHome.tsx
│           ├── DiaryPage.tsx
│           ├── DiaryHistory.tsx
│           ├── ClientReports.tsx
│           ├── ChangePassword.tsx
│           ├── ClientAccess.tsx     # Acesso via token (link público)
│           └── ClientDiaryForm.tsx  # Formulário via token (link público)
│
├── supabase/
│   └── migrations/              # Histórico completo do banco (ver seção 8)
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── vercel.json                  # Rewrites SPA + headers de cache
├── package.json
└── TECHNICAL.md                 # Este arquivo
```

---

## 5. Banco de Dados — Esquema Completo

### `profiles`
Perfis de usuários. Criado automaticamente via trigger `on_auth_user_created` ao signup.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | Referencia `auth.users(id)` |
| `email` | `text` | E-mail do usuário |
| `name` | `text` | Nome completo |
| `role` | `text` | `'therapist'` ou `'client'` |
| `active` | `boolean` | Se o cliente está ativo |
| `whatsapp` | `text` | Número WhatsApp (suporta formato internacional) |
| `address` | `text` | Endereço (não usado na UI atual) |
| `diary_id` | `uuid` | FK para `diaries` (diário vinculado ao cliente) |
| `first_login_at` | `timestamptz` | Primeiro acesso real (via `record_client_login`) |
| `last_login_at` | `timestamptz` | Último acesso real (via `record_client_login`) |
| `created_at` | `timestamptz` | Data de cadastro |

---

### `diaries`
Diários estruturados criados pela terapeuta. Apenas um pode estar ativo por vez (enforced por trigger).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `name` | `text` | Nome do diário |
| `is_active` | `boolean` | Se é o diário ativo |
| `available_from` | `time` | Horário de início de disponibilidade (ex: `08:00`) |
| `available_to` | `time` | Horário de fim de disponibilidade (ex: `22:00`) |
| `created_at` | `timestamptz` | — |

**Trigger:** `enforce_single_active_diary` — ao ativar um diário, desativa todos os outros.

---

### `diary_questions`
Perguntas de cada diário.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `diary_id` | `uuid FK` | Referencia `diaries(id)` |
| `order_num` | `integer` | Ordem de exibição |
| `text` | `text` | Texto da pergunta |
| `type` | `text` | `'text'` \| `'number'` \| `'scale'` \| `'emotion'` |
| `options` | `jsonb` | Array de `{emoji, label}` para perguntas tipo `emotion` |
| `required` | `boolean` | Se a pergunta é obrigatória |
| `created_at` | `timestamptz` | — |

---

### `diary_entries`
Registro de preenchimento diário por cliente. **Unique constraint** em `(user_id, date)` — um registro por dia.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `user_id` | `uuid FK` | Referencia `profiles(id)` |
| `diary_id` | `uuid FK` | Referencia `diaries(id)` |
| `date` | `date` | Data local do registro (sem horário) |
| `created_at` | `timestamptz` | — |

---

### `entry_answers`
Respostas individuais por pergunta de cada registro.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `entry_id` | `uuid FK` | Referencia `diary_entries(id)` |
| `question_id` | `uuid FK` | Referencia `diary_questions(id)` |
| `answer_text` | `text` | Resposta textual ou emoções separadas por `\|` |
| `answer_value` | `numeric` | Resposta numérica / escala |
| `created_at` | `timestamptz` | — |

---

### `day_notes`
Anotações livres do cliente ao longo do dia (com emoções e intensidade).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `user_id` | `uuid FK` | Referencia `auth.users(id)` |
| `noted_at` | `timestamptz` | Timestamp UTC do momento da anotação |
| `content` | `text` | Texto livre (opcional) |
| `emotions` | `jsonb` | Array de `{label: string, intensity: number}` |
| `created_at` | `timestamptz` | — |

> ⚠️ **Atenção timezone**: `noted_at` é armazenado em UTC. Ao filtrar por data local, converter os limites do dia local para UTC: `new Date(`${date}T00:00:00`).toISOString()`.

---

### `reports`
Relatórios clínicos escritos pela terapeuta.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `user_id` | `uuid FK` | Referencia `profiles(id)` (cliente destinatário) |
| `period_start` | `date` | Início do período coberto |
| `period_end` | `date` | Fim do período coberto |
| `content_text` | `text` | Conteúdo HTML sanitizado (DOMPurify) |
| `published` | `boolean` | Se está visível para o cliente |
| `created_at` | `timestamptz` | — |
| `updated_at` | `timestamptz` | — |

---

### `client_invites`
Histórico de convites de acesso enviados por e-mail.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)` |
| `email` | `text` | E-mail para onde foi enviado |
| `sent_at` | `timestamptz` | Data/hora do envio |

---

### `client_goals`
Metas de desbloqueio semanais definidas pelo cliente (ciclos de 7 registros).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `user_id` | `uuid FK` | Referencia `profiles(id)` |
| `goal_text` | `text` | Texto da meta (máx 300 caracteres) |
| `entry_count_at_creation` | `integer` | Total de registros do cliente quando a meta foi criada |
| `created_at` | `timestamptz` | — |

**Lógica de ciclo:** `entries_since_goal = total_entries - entry_count_at_creation`. Quando ≥ 7, o formulário de renovação aparece antes do diário.

---

## 6. RPCs / Funções PostgreSQL

Todas as funções são `SECURITY DEFINER` — executam com permissão do owner, não do caller.

| Função | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `handle_new_user()` | — | `trigger` | Auto-cria `profiles` ao signup em `auth.users` |
| `enforce_single_active_diary()` | — | `trigger` | Garante apenas um diário ativo por vez |
| `delete_auth_user_on_profile_delete()` | — | `trigger` | Deleta `auth.users` ao deletar profile |
| `record_client_login()` | — | `void` | Registra `first_login_at` (apenas na 1ª vez) e atualiza `last_login_at`. Chamado pelo `ClientLayout` a cada sessão. |
| `get_client_last_login(p_client_id uuid)` | `uuid` | `timestamptz` | Retorna `last_login_at` de um cliente. Apenas terapeuta. |
| `get_clients_last_login()` | — | `TABLE(client_id, last_login, first_login)` | Retorna login info de todos os clientes. Apenas terapeuta. |
| `update_client_profile(...)` | múltiplos | `json` | Atualiza campos do profile de um cliente. Apenas terapeuta. |

---

## 7. Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Resumo das políticas:

| Tabela | Terapeuta | Cliente |
|---|---|---|
| `profiles` | SELECT/INSERT/UPDATE todos | SELECT/UPDATE próprio |
| `diaries` | SELECT/INSERT/UPDATE todos | SELECT se `is_active = true` |
| `diary_questions` | SELECT/INSERT/UPDATE/DELETE | SELECT se diário ativo |
| `diary_entries` | SELECT todos | SELECT/INSERT próprios |
| `entry_answers` | SELECT todos | SELECT/INSERT próprios (via `entry_id`) |
| `reports` | SELECT/INSERT/UPDATE todos | SELECT se `published = true` E próprios |
| `day_notes` | SELECT todos | SELECT/INSERT/UPDATE/DELETE próprios |
| `client_invites` | ALL | — |
| `client_goals` | SELECT todos | ALL próprios |

> **Padrão de verificação de role nas políticas:** `EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'therapist')` — evita recursão infinita ao não usar subquery em `profiles` sem o schema qualificado.

---

## 8. Histórico de Migrations

| Arquivo | Data | Descrição |
|---|---|---|
| `20260503000339_create_portal_d4_schema.sql` | 2026-05-03 | Schema inicial completo (profiles, diaries, questions, entries, answers, reports) |
| `20260503003733_create_therapist_user_nubia.sql` | 2026-05-03 | Criação do usuário terapeuta inicial |
| `20260503022814_fix_profiles_rls_recursive_loop.sql` | 2026-05-03 | Corrige loop infinito nas políticas RLS |
| `20260503023029_fix_all_rls_remove_profiles_subquery.sql` | 2026-05-03 | Remove subqueries em profiles nas políticas para evitar recursão |
| `20260503035010_..._fix_nubia_password_and_identity.sql` | 2026-05-03 | Correção de identity/senha da conta terapeuta |
| `20260503043734_fix_diaries_and_questions_rls_policies.sql` | 2026-05-03 | Correção das políticas de diários e questões |
| `20260504000000_create_client_tokens.sql` | 2026-05-04 | Sistema de tokens públicos para acesso sem login |
| `20260504050000_fix_diary_order_column.sql` | 2026-05-04 | Renomeia coluna `order` para `order_num` (conflito com palavra reservada SQL) |
| `20260504060000_add_update_client_diary_entry.sql` | 2026-05-04 | RPC para atualizar entrada via token |
| `20260505070000_delete_auth_user_on_profile_delete.sql` | 2026-05-05 | Trigger para deletar auth.users ao deletar profile |
| `20260505080000_add_update_client_profile_rpc.sql` | 2026-05-05 | RPC `update_client_profile` para terapeuta editar dados do cliente |
| `20260505090000_add_options_to_diary_questions.sql` | 2026-05-05 | Coluna `options jsonb` para perguntas tipo `emotion` |
| `20260505100000_add_day_notes.sql` | 2026-05-05 | Tabela `day_notes` para anotações livres do cliente |
| `20260505110000_add_diary_availability.sql` | 2026-05-05 | Colunas `available_from` / `available_to` no diário (janela de horário) |
| `20260505120000_add_question_required.sql` | 2026-05-05 | Coluna `required boolean` nas perguntas |
| `20260506100000_add_client_invites.sql` | 2026-05-06 | Tabela `client_invites` (histórico de convites por e-mail) |
| `20260506110000_add_get_client_last_login.sql` | 2026-05-06 | RPC `get_client_last_login` (usa `auth.users.last_sign_in_at`) |
| `20260506120000_add_get_clients_last_login_bulk.sql` | 2026-05-06 | RPC `get_clients_last_login` bulk para o Dashboard |
| `20260506130000_add_client_login_tracking.sql` | 2026-05-06 | Colunas `first_login_at` / `last_login_at` em `profiles` + RPC `record_client_login` |
| `20260506140000_add_client_goals.sql` | 2026-05-06 | Tabela `client_goals` para metas semanais de desbloqueio |

---

## 9. Autenticação e Autorização

### Fluxo de login
1. Usuário entra email + senha na tela `/login`
2. `supabase.auth.signInWithPassword` → JWT retornado
3. `AuthContext` escuta `onAuthStateChange`, busca `profiles` pelo `user.id`
4. `App.tsx` redireciona por `profile.role`: `therapist` → `/dashboard`, `client` → `/home`

### Recuperação de senha
1. Terapeuta clica "Enviar convite" no `ClientDetail` → `supabase.auth.resetPasswordForEmail` com `redirectTo: resetPasswordUrl`
2. Supabase envia e-mail via ZeptoMail (configurado no painel Supabase)
3. Link redireciona para `https://portal4d.vercel.app/reset-password`
4. `ResetPassword.tsx` detecta o token na URL (fragment `#access_token=...`) e exibe formulário de nova senha
5. `supabase.auth.updateUser({ password })` → senha atualizada

> **Configuração Supabase:** OTP expiry = 86400 segundos (24h). SMTP: ZeptoMail, smtp.zeptomail.com:587, usuário `emailapikey`.

### Rastreamento de login real
`auth.users.last_sign_in_at` é atualizado no **signup**, não no login real. Por isso, usamos a RPC `record_client_login()` chamada pelo `ClientLayout` a cada sessão autenticada (via `useRef` para evitar chamadas duplicadas). Isso popula `profiles.first_login_at` e `profiles.last_login_at`.

### Acesso público (token)
Clientes também podem acessar via link com token (`/client/:token`) sem login. Esse sistema (`ClientAccess.tsx`, `ClientDiaryForm.tsx`) usa RPCs com validação de token.

---

## 10. Roteamento Frontend

### Rotas públicas
| Rota | Componente | Descrição |
|---|---|---|
| `/login` | `Login` | Login terapeuta/cliente |
| `/reset-password` | `ResetPassword` | Redefinição de senha via link |
| `/client/:token` | `ClientAccess` | Acesso via token público |
| `/client/:token/diary` | `ClientDiaryForm` | Formulário via token público |

### Rotas — Terapeuta
| Rota | Componente |
|---|---|
| `/dashboard` | `Dashboard` |
| `/clients` | `Clients` |
| `/clients/new` | `NewClient` |
| `/clients/:id` | `ClientDetail` |
| `/clients/:id/entries` | `ClientEntries` |
| `/clients/:id/reports` | `ClientReports` |
| `/clients/:id/report/new` | `NewReport` |
| `/diaries` | `Diaries` |
| `/diaries/new` | `NewDiary` |
| `/diaries/:id` | `DiaryDetail` |
| `/reports` | `Reports` |
| `/reports/:clientId` | `ReportsByClient` |
| `/reports/:clientId/new` | `NewReport` |
| `/reports/:clientId/edit/:reportId` | `EditReport` |

### Rotas — Cliente
| Rota | Componente |
|---|---|
| `/home` | `ClientHome` |
| `/diary` | `DiaryPage` |
| `/diary/history` | `DiaryHistory` |
| `/reports` | `ClientReports` |
| `/change-password` | `ChangePassword` |

---

## 11. Páginas — Terapeuta

### `Dashboard`
- Lista todos os clientes com status de atividade
- Calcula "dias desde o último registro" a partir de `first_login_at` (não da data de cadastro)
- Clientes sem `first_login_at` exibem badge "Aguardando acesso" (sem botão WhatsApp)
- Integra `get_clients_last_login()` em paralelo com as demais queries
- Nomes de clientes são links para `ClientDetail`
- Suporte a WhatsApp internacional: detecta `+` ou `> 11 dígitos` para não adicionar DDI 55

### `Clients`
- Lista e busca de clientes
- Ativação/desativação inline
- Criação de cliente via `NewClient`

### `ClientDetail`
- Informações do cliente (email, WhatsApp com edição inline, diário vinculado, data de cadastro, último acesso)
- Envio e histórico de convites de acesso
- Timeline das últimas 10 entradas do diário
- Seção **Metas de Desbloqueio** — histórico de todas as metas do cliente
- Links para entradas completas e relatórios

### `ClientEntries`
- Listagem de todas as entradas do diário com respostas expandíveis

### `NewReport` / `EditReport`
- Editor rico para relatórios clínicos (HTML sanitizado com DOMPurify)
- Preview antes de publicar
- Botão de publicação muda visibilidade para o cliente

### `Diaries` / `NewDiary` / `DiaryDetail`
- CRUD de diários estruturados
- Tipos de pergunta: `text`, `number`, `scale` (1-10), `emotion` (com emoji e intensidade)
- Controle de janela de disponibilidade (horário de abertura/fechamento)

---

## 12. Páginas — Cliente

### `ClientHome`
- Saudação personalizada
- Alerta de dias passados sem preenchimento (link para histórico)
- Card do diário de hoje (preenchido/pendente)
- **Card da meta atual** (gold, link para `/diary`)
- Estatísticas: sequência de dias, total de registros, relatórios disponíveis
- Links rápidos para histórico e relatórios

### `DiaryPage`
- Suporta data via `?date=YYYY-MM-DD` (histórico editável)
- **Aba Anotações** (só hoje): lista de anotações do dia + formulário de nova anotação com emoções e intensidade (1-10)
- **Aba Diário**: formulário de perguntas ou resultado já preenchido
- **Formulário de Meta** (bloqueia acesso ao diário quando necessário):
  - Fase `new`: primeira meta do cliente
  - Fase `renew`: ao completar 7 registros desde a última meta (pré-preenchido com meta anterior para manter ou editar)
- Banner dourado com a meta ativa exibido acima das abas

**Filtro de notas timezone-safe:**
```ts
const dayStart = new Date(`${diaryDate}T00:00:00`).toISOString(); // local → UTC
const dayEnd   = new Date(`${diaryDate}T23:59:59`).toISOString();
```

### `DiaryHistory`
- Timeline completa desde o cadastro até hoje
- **Dias preenchidos**: expandíveis — mostram respostas + seção "Anotações do dia"
- **Dias pendentes**: badge com contagem de anotações se houver; expandíveis para ver as anotações; botão "Preencher"
- Notas agrupadas por **data local** (timezone-aware): `toLocalISODate(new Date(note.noted_at))`

### `ClientReports`
- Lista relatórios publicados pela terapeuta
- Conteúdo HTML renderizado com `dangerouslySetInnerHTML` (DOMPurify sanitiza na origem)

### `ChangePassword`
- Formulário para troca de senha pelo cliente autenticado

---

## 13. Componentes UI

Todos em `src/components/ui/`:

| Componente | Props principais | Descrição |
|---|---|---|
| `Button` | `variant`, `size`, `loading` | Botão com estados e spinner |
| `Card` / `CardBody` | `className` | Container de card com sombra e borda |
| `Input` | `hint`, `error`, padrão HTML | Input com label, hint e erro |
| `Textarea` | padrão HTML | Textarea estilizado |
| `ScaleInput` | `value`, `onChange` | Seletor de escala 1-10 |
| `Badge` | `variant` | Pill de status (`success`, `warning`, `neutral`, etc.) |
| `Modal` | `open`, `onClose`, `title` | Modal com backdrop |
| `Spinner` / `PageSpinner` | — | Indicadores de carregamento |
| `EmptyState` | `icon`, `title`, `description` | Estado vazio padronizado |

---

## 14. Bibliotecas Utilitárias

### `src/lib/supabase.ts`
```ts
export const supabase = createClient<Database>(url, key);
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
export const resetPasswordUrl = `${appUrl}/reset-password`;
```

### `src/lib/format.ts`
Funções de formatação de data para exibição em pt-BR.

### `src/lib/database.types.ts`
Tipos TypeScript de todas as entidades do banco + tipo `Database` para o cliente Supabase tipado.

### `src/contexts/AuthContext.tsx`
Fornece: `user`, `session`, `profile`, `loading`, `signIn()`, `signOut()`, `isTherapist`, `isClient`.  
Escuta `onAuthStateChange` para reatividade a login/logout.

---

## 15. Funcionalidades Principais

### Diário estruturado
- Terapeuta cria diário com N perguntas de tipos variados
- Apenas um diário ativo por vez (trigger no banco)
- Janela de horário configurável (fora da janela → mensagem de bloqueio)
- Perguntas obrigatórias validadas no submit
- Um registro por dia por cliente (unique constraint)

### Anotações do dia
- Cliente pode fazer N anotações ao longo do dia com texto livre e/ou emoções
- 14 emoções fixas com seleção de intensidade (1-10)
- Aparecem na aba "Anotações" do dia atual e no histórico

### Metas semanais (Desbloqueio)
- Ciclo de 7 registros de diário
- Antes do 1º registro (sem meta): formulário obrigatório de nova meta
- Ao completar 7 registros: formulário de renovação pré-preenchido com meta anterior
- Meta exibida: home do cliente (card dourado) + acima do diário (banner) + histórico na ClientDetail

### Relatórios clínicos
- Terapeuta escreve relatório em HTML rico por período
- Publicação controlada (cliente só vê após publicar)
- DOMPurify sanitiza o HTML na renderização

### Rastreamento de atividade
- `first_login_at`: primeiro acesso real (preenchido por `record_client_login`)
- `last_login_at`: último acesso real
- Dashboard mostra dias sem atividade a partir do primeiro acesso (não do cadastro)
- Clientes sem primeiro acesso mostram "Aguardando acesso"

### Convites de acesso
- Terapeuta envia link via `supabase.auth.resetPasswordForEmail`
- Histórico de convites armazenado em `client_invites`
- Links sempre apontam para `VITE_APP_URL` (não localhost)

---

## 16. Deploy e CI/CD

### Pipeline
```
git push origin main
    └─→ Vercel detecta push
        └─→ npm run build (vite build)
            └─→ Deploy automático para produção
```

### `vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- **Rewrite**: necessário para SPA — qualquer rota direta retorna `index.html`
- **`/index.html` sem cache**: garante que usuários sempre recebem o HTML mais recente após um deploy, evitando execução de bundle desatualizado
- **`/assets/*` imutável**: assets Vite têm hash no nome (ex: `index-C385xr1f.js`), logo são safe para cache longo (1 ano)

### Testes antes de subir
```bash
npm run dev          # desenvolvimento local (hot reload)
npm run typecheck    # TypeScript sem compilar
npm run build        # build de produção local
npm run preview      # serve o build localmente
```

---

## 17. Decisões Técnicas Importantes

### Por que SECURITY DEFINER nas RPCs?
Funções como `record_client_login` precisam escrever em `profiles` com permissões elevadas sem expor a tabela via RLS para esse tipo de operação.

### Por que `.then(() => {}, () => {})` em vez de `.catch()`?
O `SupabaseClient.rpc()` retorna um `PostgrestBuilder`, não uma `Promise` nativa. Esse objeto não expõe `.catch()` diretamente — chamar `.catch()` causa `TypeError: .catch is not a function` que derruba o React completo. Usar `.then(onFulfilled, onRejected)` funciona pois `.then()` é implementado.

### Por que `new Date(`${date}T00:00:00`).toISOString()` para filtrar notas?
`noted_at` é salvo em UTC. Para filtrar pelo dia local, `new Date('2024-01-15T00:00:00')` (sem timezone) é interpretado como **hora local** pelo JS, e `.toISOString()` converte para UTC. Assim o filtro respeita o fuso do usuário sem depender de configuração do servidor.

### Por que `first_login_at` em `profiles` e não `auth.users.last_sign_in_at`?
`auth.users.last_sign_in_at` é atualizado no **momento do signup** (não no primeiro login real), o que gerava falsos positivos no Dashboard. A coluna customizada só é preenchida quando o cliente realmente abre o app autenticado.

### Número WhatsApp internacional
```ts
const number = (raw.startsWith('+') || digits.length > 11) ? digits : `55${digits}`;
```
Se o número começa com `+` ou tem mais de 11 dígitos, assume que já tem DDI. Caso contrário, adiciona `55` (Brasil).

---

## 18. Problemas Conhecidos e Soluções Aplicadas

| Problema | Causa | Solução |
|---|---|---|
| Loop infinito RLS | Policy em `profiles` consultava `profiles` para verificar role | Usar `public.profiles` qualificado e reestruturar policies |
| 404 em rotas diretas no Vercel | SPA sem fallback | `vercel.json` com rewrite `/(.*) → /index.html` |
| Links de convite apontando para `localhost` | `window.location.origin` retorna host atual | `VITE_APP_URL` env var + export `resetPasswordUrl` em `supabase.ts` |
| `.catch is not a function` derrubando app mobile | `PostgrestBuilder` não é `Promise` nativa | Substituir `.catch()` por `.then(() => {}, () => {})` |
| Bundle desatualizado em cache no cliente | Browser cacheia JS antigo | `no-cache` no `index.html` + `immutable` nos assets com hash |
| OTP de convite expirando | Padrão Supabase de 1h | Configurar OTP expiry para 86400s (24h) no painel Supabase |
| E-mail transacional bloqueado (Zoho) | Zoho bloqueia envios transacionais no plano gratuito | Migrar para ZeptoMail (smtp.zeptomail.com, porta 587) |
| `get_clients_last_login` com erro de tipo ao alterar retorno | PostgreSQL não permite `CREATE OR REPLACE` com novo tipo de retorno | Usar `DROP FUNCTION IF EXISTS` antes de recriar |
| Notas de outros dias aparecendo | Filtro usava string de data local, Supabase interpreta como UTC | Converter limites do dia local para UTC com `new Date(...T00:00:00).toISOString()` |
| `auth.users.last_sign_in_at` incorreto | Supabase o preenche no signup, não no login | Criar `first_login_at`/`last_login_at` em `profiles` + RPC `record_client_login` |
