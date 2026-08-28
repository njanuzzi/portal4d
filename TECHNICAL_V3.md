# Portal 4D — Documentação Técnica V3

> **Versão:** 3.0
> **Última atualização:** 2026-08-26
> **Projeto:** Assistente de IA do Portal (bot com contexto clínico, assinatura e metas)
> **Responsável técnico:** Claude (Anthropic) + Núbia Januzzi
> **Base:** TECHNICAL_V2.md (V2.0 — WhatsApp)

Este documento é um **plano de implementação**, não um relato do que já foi feito — assim como o V2, serve
de guia pra construir a feature. As seções 5–10 descrevem exatamente o que já existe hoje no repositório
(baseline), pra deixar claro onde a V3 encosta em código que já funciona.

---

## Sumário

1. [Visão Geral da V3](#1-visão-geral-da-v3)
2. [Baseline — O Que Já Existe](#2-baseline--o-que-já-existe)
3. [Fluxo Completo](#3-fluxo-completo)
4. [Pré-requisitos](#4-pré-requisitos)
5. [Credenciais e Variáveis de Ambiente](#5-credenciais-e-variáveis-de-ambiente)
6. [Banco de Dados — Tabelas Novas](#6-banco-de-dados--tabelas-novas)
7. [Migrations](#7-migrations)
8. [Backend](#8-backend)
9. [pg_cron — Agendamento do Resumo de Contexto](#9-pg_cron--agendamento-do-resumo-de-contexto)
10. [Alterações no Frontend](#10-alterações-no-frontend)
11. [Prompt do Bot](#11-prompt-do-bot)
12. [Ordem de Implementação](#12-ordem-de-implementação)
13. [Decisões Técnicas](#13-decisões-técnicas)
14. [Problemas Conhecidos e Mitigações](#14-problemas-conhecidos-e-mitigações)

---

## 1. Visão Geral da V3

A V3 transforma o assistente de chat do portal (hoje grátis e sem contexto clínico real) numa **feature
paga, opcional, com memória de sessões/relatórios e capacidade de sugerir metas e alertar risco**.

### O que muda para a cliente
- O bot deixa de ser grátis por padrão — passa a ser uma **assinatura opcional** (Stripe).
- Depois de assinar, o bot "conhece" o histórico dela (sem citar sessões literalmente) — a sensação é de
  continuidade, não de estar conversando com um FAQ.
- O bot pode, durante a conversa, sugerir uma meta pequena — a cliente confirma ou descarta.
- Se a cliente mencionar sinais de risco, o bot mostra recursos de emergência na hora.

### O que muda para a terapeuta
- Nova aba/seção: status da assinatura do bot por cliente.
- Badge de alerta no dashboard quando o bot detecta risco em alguma conversa.
- Notificação por WhatsApp (número dela mesma) em tempo real quando isso acontece.
- **Ela não lê as conversas do bot** — só o alerta (categoria + resumo curto, nunca a transcrição).

### O que NÃO muda
- Toda a lógica de diários, metas manuais, relatórios de sessão, fechamento mensal e Inventário de
  Esquemas da V1/V2.
- O bot continua sendo só apoio entre sessões — não substitui terapia, não diagnostica.

---

## 2. Baseline — O Que Já Existe

Antes de implementar, vale saber que boa parte da infraestrutura de IA e mensageria **já está no
repositório** — a V3 estende isso, não começa do zero.

| Peça | Arquivo | O que já faz |
|---|---|---|
| Chat com IA | [`api/chat.ts`](../api/chat.ts) | Vercel Function (Node), AI SDK (`streamText`) com `@ai-sdk/anthropic` chamando a Anthropic direto (chave dedicada `BOT_ANTHROPIC_API_KEY`, não passa pelo AI Gateway da Vercel — trocado na Fase 1 depois de descobrir que o Gateway exige billing próprio sem trazer benefício real pra um uso de provedor único), autenticado com o JWT da própria cliente (RLS aplicado, nunca service role). Contexto hoje = só a entrada de diário do dia. |
| Widget de chat | [`src/components/client/ClientChatbot.tsx`](../src/components/client/ClientChatbot.tsx) | Botão flutuante, montado em `ClientLayout` pra toda cliente, sem gate nenhum. |
| Metas | `client_goals` ([migration](../supabase/migrations/20260506140000_add_client_goals.sql)) | Ciclo semanal (7 diários), encerramento com observações — tudo em [`DiaryPage.tsx`](../src/pages/client/DiaryPage.tsx). |
| Notas de sessão | `session_reports` ([migration](../supabase/migrations/20260825190000_add_session_reports.sql)) | Uma linha por sessão (`rascunho` → `revisado` → `publicado`), `content_html`. |
| Perfil de esquemas | `client_schema_reports` (sem migration rastreada) | `technical_content` — leitura técnica de Terapia do Esquema, usada como contexto interno em relatórios, nunca citada literalmente pra cliente. |
| Fechamento mensal com IA | [`supabase/functions/generate-monthly-report`](../supabase/functions/generate-monthly-report/index.ts) | Edge Function Deno + `@anthropic-ai/sdk` direto (não Vercel Gateway), modelo `claude-sonnet-5`. Já implementa a regra de **"voz sistêmica"**: usa o perfil de esquemas só como pano de fundo, nunca cita jargão técnico na saída. **Esse é o padrão que a V3 reaproveita pro resumo de contexto do bot.** |
| Envio de WhatsApp | [`supabase/functions/whatsapp-send-reminder`](../supabase/functions/whatsapp-send-reminder/index.ts) e `whatsapp-send-invite` | Já sabem mandar mensagem via Meta Graph API pro número de uma cliente. A V3 reaproveita esse helper pra notificar a **terapeuta** (que também é um `profiles` com `whatsapp`). |
| Notificação por e-mail | ZeptoMail, usado em `schema-assessment-start` | Padrão de fire-and-forget já estabelecido, não usado na V3 mas disponível como alternativa futura. |

---

## 3. Fluxo Completo

```
[CLIENTE]
Abre o portal → vê CTA "Assinar assistente" (se não tiver bot_subscriptions ativa)
    └─→ api/create-checkout-session.ts → Stripe Checkout (modo subscription)
    └─→ Cliente paga no Stripe
    └─→ Stripe dispara webhook checkout.session.completed
            └─→ api/stripe-webhook.ts (service role) grava bot_subscriptions (status: active)

[TODA NOITE — pg_cron, 3h UTC]
    └─→ Edge Function: generate-bot-context
            └─→ Pra cada cliente com bot_subscriptions.status = 'active':
                    - Busca session_reports (revisado/publicado) recentes
                    - Busca client_schema_reports (reviewed/published) mais recente
                    - Manda pro Claude com prompt "resuma sem citar literalmente, sem jargão"
                    - Grava/atualiza client_bot_context.summary_text

[CLIENTE conversa com o bot]
Abre o ClientChatbot → api/chat.ts confirma bot_subscriptions ativa
    └─→ Se não ativa: mostra CTA de assinatura em vez do chat
    └─→ Se ativa: monta system prompt com client_bot_context.summary_text + diário do dia
    └─→ streamText com tools: proposeGoal, flagRisk

    ├── Bot identifica que faz sentido propor uma meta
    │       └─→ chama tool proposeGoal(text)
    │       └─→ insere em client_goals (source='bot', confirmed_at=null)
    │       └─→ ClientHome.tsx mostra card "seu assistente sugeriu uma meta" — cliente confirma/descarta
    │
    └── Bot identifica sinal de risco (crise, autolesão, ideação suicida)
            └─→ chama tool flagRisk(category, safe_summary)
            └─→ insere em bot_risk_alerts (client_id, category, safe_summary — nunca a transcrição)
            └─→ chama Edge Function notify-therapist-risk
                    └─→ busca profiles.whatsapp da terapeuta
                    └─→ envia WhatsApp via Meta Graph API (mesmo helper do lembrete de diário)
            └─→ resposta do bot já mostra CVV (188) / emergência pra cliente, na mesma mensagem

[TERAPEUTA]
Dashboard mostra badge de alerta quando existe bot_risk_alerts sem acknowledged_at
    └─→ Clica → vê categoria + resumo curto (nunca a conversa) → marca como visto
```

---

## 4. Pré-requisitos

### 4.1 Stripe

| # | O que fazer | Onde |
|---|---|---|
| 1 | Criar conta Stripe (ou usar existente) | dashboard.stripe.com |
| 2 | Instalar a integração Stripe via **Vercel Marketplace** (não instalar o SDK cru sem passar por lá) | Vercel Dashboard → projeto → Integrations |
| 3 | Criar um **Product** "Assistente do Portal 4D" com um **Price** recorrente mensal | Stripe Dashboard → Products |
| 4 | Configurar endpoint de webhook apontando pra `api/stripe-webhook.ts` (URL de produção) | Stripe Dashboard → Developers → Webhooks |
| 5 | Assinar os eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` | Mesma tela |

> ⚠️ Antes de mexer em pagamento, carregar a skill `vercel:marketplace` — ela cobre o fluxo de
> provisionamento certo em vez de colar chaves de API manualmente.

### 4.2 Dependências novas

```bash
npm install stripe
```

(`ai`, `@ai-sdk/react` e `@supabase/supabase-js` já estão instalados.)

### 4.3 Supabase

Nenhuma extension nova além das que a V2 já ativou (`pg_cron`, `pg_net`).

---

## 5. Credenciais e Variáveis de Ambiente

### Vercel (Dashboard → Settings → Environment Variables)

```env
STRIPE_SECRET_KEY=sk_live_...              # ou sk_test_... em preview
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BOT_PRICE_ID=price_...              # o Price recorrente criado no 4.1
SUPABASE_SERVICE_ROLE_KEY=                 # já deve existir; necessário pro webhook gravar bot_subscriptions
BOT_ANTHROPIC_API_KEY=                     # chave dedicada ao bot — api/chat.ts chama a Anthropic direto
                                            # com ela, SEM passar pelo AI Gateway da Vercel (ver Decisões
                                            # Técnicas: o Gateway exige billing próprio à parte, sem
                                            # benefício real pra um uso de provedor único)
```

### Supabase (Dashboard → Edge Functions → Secrets)

```env
BOT_INTERNAL_SECRET=                       # string aleatória — protege notify-therapist-risk de chamadas externas
BOT_ANTHROPIC_API_KEY=                     # mesma chave de cima — a Fase 2 (generate-bot-context) roda como
                                            # Edge Function no Supabase, então precisa dela cadastrada aqui
                                            # também, além de na Vercel
# WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID já existem da V2 — reaproveitados, não duplicar
```

> ⚠️ `BOT_ANTHROPIC_API_KEY` é intencionalmente **separada** da `ANTHROPIC_API_KEY` já usada por
> `generate-monthly-report` — chave própria por funcionalidade, pra medir custo e uso do bot isoladamente
> no console da Anthropic (e poder revogar/limitar sem afetar o fechamento mensal). Precisa estar
> cadastrada em **dois lugares** (Vercel e Supabase) porque o bot tem código rodando nas duas plataformas.

---

## 6. Banco de Dados — Tabelas Novas

### `bot_subscriptions`
Controla se a cliente pagou o acesso ao bot.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)`, único |
| `stripe_customer_id` | `text` | — |
| `stripe_subscription_id` | `text` | — |
| `status` | `text` | `active` / `past_due` / `canceled` |
| `current_period_end` | `timestamptz` | Fim do ciclo pago atual |
| `created_at` / `updated_at` | `timestamptz` | — |

### `client_bot_context`
Resumo clínico gerado pra alimentar o system prompt do bot — nunca exibido cru pra ninguém.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)`, único |
| `summary_text` | `text` | Resumo gerado pelo Claude, sem jargão técnico, sem citação literal |
| `sessions_considered` | `integer` | Quantas `session_reports` entraram no resumo (auditoria) |
| `generated_at` | `timestamptz` | — |

### `bot_risk_alerts`
Alerta de risco — categoria e resumo curto, nunca a conversa inteira.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)` |
| `category` | `text` | `ideacao_suicida` / `autolesao` / `risco_generico` |
| `safe_summary` | `text` | Frase curta gerada pelo próprio bot (ex: "cliente mencionou pensamentos de desistir") |
| `acknowledged_at` | `timestamptz` | Quando a terapeuta marcou como vista |
| `created_at` | `timestamptz` | — |

### `client_goals` (alteração)
Duas colunas novas pra suportar metas sugeridas pelo bot sem duplicar a lógica de ciclo do `DiaryPage.tsx`.

| Coluna nova | Tipo | Descrição |
|---|---|---|
| `source` | `text` | `'client'` (default) ou `'bot'` |
| `confirmed_at` | `timestamptz` | `null` enquanto pendente de confirmação; setado quando a cliente aceita |

### `bot_messages`
Histórico da conversa entre a cliente e o bot — sem isso, o `useChat` só guarda mensagens na memória do
navegador e a conversa some ao atualizar a página ou voltar no dia seguinte.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)` |
| `role` | `text` | `user` / `assistant` |
| `content` | `text` | Texto da mensagem |
| `created_at` | `timestamptz` | — |

**Sem policy de leitura pra terapeuta** — diferente de `bot_subscriptions`/`client_bot_context`, essa
tabela não tem nenhuma policy que dê acesso a `role = 'therapist'`. A decisão de "terapeuta vê só alertas"
precisa estar na estrutura do banco, não só escondida na UI.

---

## 7. Migrations

Arquivo: `supabase/migrations/YYYYMMDDHHMMSS_bot_v3.sql`

```sql
-- bot_subscriptions
create table public.bot_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null check (status in ('active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bot_subscriptions enable row level security;

create policy "client_read_own_subscription" on public.bot_subscriptions
  for select using (client_id = auth.uid());

create policy "therapist_read_subscriptions" on public.bot_subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );

-- Sem policy de insert/update pra authenticated: só o webhook (service role) escreve aqui.

-- client_bot_context
create table public.client_bot_context (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  summary_text text not null default '',
  sessions_considered integer not null default 0,
  generated_at timestamptz not null default now()
);

alter table public.client_bot_context enable row level security;

-- Só o backend (service role, na generate-bot-context) e o próprio api/chat.ts (via JWT
-- da cliente) precisam ler; terapeuta não precisa ver o resumo bruto, mas liberamos leitura
-- pra ela poder auditar o que o bot "sabe" se um dia for preciso.
create policy "client_read_own_context" on public.client_bot_context
  for select using (client_id = auth.uid());

create policy "therapist_read_context" on public.client_bot_context
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );

-- bot_risk_alerts
create table public.bot_risk_alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('ideacao_suicida', 'autolesao', 'risco_generico')),
  safe_summary text not null check (char_length(safe_summary) <= 300),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bot_risk_alerts enable row level security;

-- A própria cliente (via JWT, dentro de api/chat.ts) grava o alerta quando o bot chama a tool —
-- mas nunca lê de volta, só a terapeuta.
create policy "client_insert_own_risk_alert" on public.bot_risk_alerts
  for insert with check (client_id = auth.uid());

create policy "therapist_manage_risk_alerts" on public.bot_risk_alerts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'therapist')
  );

create index bot_risk_alerts_unacknowledged_idx
  on public.bot_risk_alerts (created_at desc) where acknowledged_at is null;

-- client_goals: suporte a metas sugeridas pelo bot
alter table public.client_goals add column source text not null default 'client' check (source in ('client', 'bot'));
alter table public.client_goals add column confirmed_at timestamptz;
update public.client_goals set confirmed_at = created_at where source = 'client';

-- bot_messages: histórico da conversa (sem isso o chat esquece tudo ao recarregar a página)
create table public.bot_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.bot_messages enable row level security;

-- Só a própria cliente lê e escreve — sem policy nenhuma pra terapeuta aqui,
-- de propósito: "terapeuta vê só alertas" precisa estar garantido pelo banco.
create policy "client_own_messages" on public.bot_messages
  for all using (client_id = auth.uid()) with check (client_id = auth.uid());

create index bot_messages_client_id_idx on public.bot_messages (client_id, created_at);
```

---

## 8. Backend

### 8.1 `api/create-checkout-session.ts`

**Gatilho:** cliente clica em "Assinar assistente" no portal.

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const accessToken = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return new Response('Unauthorized', { status: 401 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_BOT_PRICE_ID!, quantity: 1 }],
    client_reference_id: userData.user.id,
    customer_email: userData.user.email,
    success_url: `${process.env.VITE_APP_URL}/cliente?bot_assinado=1`,
    cancel_url: `${process.env.VITE_APP_URL}/cliente`,
  });

  return Response.json({ url: session.url });
}
```

### 8.2 `api/stripe-webhook.ts`

**Gatilho:** Stripe, nos eventos configurados em 4.1.

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook signature inválida: ${err}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const clientId = session.client_reference_id;
    if (clientId) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await supabase.from('bot_subscriptions').upsert({
        client_id: clientId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        status: 'active',
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }, { onConflict: 'client_id' });
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const status = subscription.status === 'active' ? 'active'
      : subscription.status === 'past_due' ? 'past_due' : 'canceled';
    await supabase.from('bot_subscriptions')
      .update({ status, current_period_end: new Date(subscription.current_period_end * 1000).toISOString() })
      .eq('stripe_subscription_id', subscription.id);
  }

  return new Response('ok', { status: 200 });
}
```

> ⚠️ `vercel.json` precisa excluir esse endpoint de qualquer rewrite/parse de body — o Stripe exige o
> corpo cru (`rawBody`) pra verificar a assinatura. O `runtime: 'nodejs'` com `req.text()` já resolve isso
> desde que nenhum middleware reescreva o body antes.

### 8.3 `api/chat.ts` (evolução)

Mudanças sobre o que já existe hoje:

1. Antes de montar o `system`, verificar `bot_subscriptions.status = 'active'` — se não, retornar 402.
2. Buscar `client_bot_context.summary_text` e incluir no prompt.
3. Adicionar `tools: { proposeGoal, flagRisk }` ao `streamText`.
4. Gravar cada mensagem (cliente e bot) em `bot_messages`, pra conversa sobreviver a um refresh/dia
   seguinte. O carregamento do histórico ao abrir o chat acontece direto no `ClientChatbot.tsx` (ver seção
   10) — a cliente já tem acesso de leitura à própria `bot_messages` via RLS, sem precisar de outro endpoint.

```typescript
import { createClient } from '@supabase/supabase-js';
import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';

export const config = { runtime: 'nodejs' };

const anthropic = createAnthropic({ apiKey: process.env.BOT_ANTHROPIC_API_KEY });

// ... SYSTEM_PROMPT definido na seção 11 ...

export async function POST(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const accessToken = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return new Response('Unauthorized', { status: 401 });
  const clientId = userData.user.id;

  const { data: subscription } = await supabase
    .from('bot_subscriptions')
    .select('status')
    .eq('client_id', clientId)
    .maybeSingle();
  if (subscription?.status !== 'active') {
    return new Response(JSON.stringify({ error: 'subscription_required' }), { status: 402 });
  }

  const { data: context } = await supabase
    .from('client_bot_context')
    .select('summary_text')
    .eq('client_id', clientId)
    .maybeSingle();

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Grava a mensagem que acabou de chegar da cliente (a última do array).
  const lastUserMessage = messages[messages.length - 1];
  const lastUserText = lastUserMessage.parts.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
  await supabase.from('bot_messages').insert({ client_id: clientId, role: 'user', content: lastUserText });

  // ... busca diaryContext como já existe hoje ...

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: `${SYSTEM_PROMPT}\n\nContexto de fundo (nunca citar literalmente):\n${context?.summary_text ?? 'Sem histórico ainda.'}\n\n${diaryContext}`,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ text }) => {
      await supabase.from('bot_messages').insert({ client_id: clientId, role: 'assistant', content: text });
    },
    tools: {
      proposeGoal: tool({
        description: 'Sugere uma meta pequena e concreta pra cliente confirmar depois — nunca cria a meta direto.',
        inputSchema: z.object({ text: z.string().max(300) }),
        execute: async ({ text }) => {
          await supabase.from('client_goals').insert({
            user_id: clientId,
            goal_text: text,
            source: 'bot',
            confirmed_at: null,
          });
          return { ok: true };
        },
      }),
      flagRisk: tool({
        description: 'Chame IMEDIATAMENTE ao detectar risco de autolesão, ideação suicida ou crise.',
        inputSchema: z.object({
          category: z.enum(['ideacao_suicida', 'autolesao', 'risco_generico']),
          safe_summary: z.string().max(300),
        }),
        execute: async ({ category, safe_summary }) => {
          await supabase.from('bot_risk_alerts').insert({ client_id: clientId, category, safe_summary });
          await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/notify-therapist-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bot-Internal-Secret': process.env.BOT_INTERNAL_SECRET! },
            body: JSON.stringify({ client_id: clientId, category }),
          }).catch(() => {}); // fire-and-forget — não bloqueia a resposta de crise pra cliente
          return { ok: true };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### 8.4 `supabase/functions/generate-bot-context/index.ts`

Mirror direto de `generate-monthly-report`, mas gerando um resumo curto em vez de um relatório inteiro.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const anthropic = new Anthropic({ apiKey: Deno.env.get("BOT_ANTHROPIC_API_KEY")! });

const SYSTEM_PROMPT = `Você resume o histórico clínico de uma cliente em terapia pra alimentar um
assistente de apoio entre sessões. O assistente NUNCA deve citar sessões ou jargão técnico literalmente
— seu resumo é só pano de fundo pra ele "lembrar" da pessoa, não uma ficha pra recitar.

Escreva 4-8 frases, em terceira pessoa, sem nomes técnicos de esquemas/modos, sem citar datas de sessão
específicas. Foque em: temas recorrentes, como a pessoa costuma se sentir/reagir, e o que tem mostrado
progresso. Nunca inclua conteúdo sensível ao pé da letra — sempre parafraseado e genérico o suficiente
pra não expor detalhe de sessão numa conversa casual.`;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").trim();
}

serve(async () => {
  const { data: subs } = await supabase
    .from("bot_subscriptions")
    .select("client_id, profiles(name)")
    .eq("status", "active");

  for (const sub of subs ?? []) {
    const { data: sessions } = await supabase
      .from("session_reports")
      .select("content_html")
      .eq("client_id", sub.client_id)
      .in("status", ["revisado", "publicado"])
      .order("session_date", { ascending: false })
      .limit(8);

    const { data: schemaReport } = await supabase
      .from("client_schema_reports")
      .select("technical_content")
      .eq("client_id", sub.client_id)
      .in("status", ["reviewed", "published"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sessions?.length && !schemaReport) continue; // nada pra resumir ainda

    const sessionsText = (sessions ?? []).map((s) => stripHtml(s.content_html)).join("\n---\n");
    const schemaText = schemaReport?.technical_content ? `\n\nPerfil de esquemas:\n${stripHtml(schemaReport.technical_content)}` : "";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Sessões recentes:\n${sessionsText}${schemaText}` }],
    });

    const summary = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();

    await supabase.from("client_bot_context").upsert({
      client_id: sub.client_id,
      summary_text: summary,
      sessions_considered: sessions?.length ?? 0,
      generated_at: new Date().toISOString(),
    }, { onConflict: "client_id" });
  }

  return new Response("ok", { status: 200 });
});
```

### 8.5 `supabase/functions/notify-therapist-risk/index.ts`

**Gatilho:** chamado por `api/chat.ts` quando a tool `flagRisk` dispara. `verify_jwt = false` (protegido
por `BOT_INTERNAL_SECRET`, não por sessão de usuário).

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const INTERNAL_SECRET = Deno.env.get("BOT_INTERNAL_SECRET")!;

const CATEGORY_LABEL: Record<string, string> = {
  ideacao_suicida: "ideação suicida",
  autolesao: "autolesão",
  risco_generico: "risco genérico",
};

serve(async (req) => {
  if (req.headers.get("X-Bot-Internal-Secret") !== INTERNAL_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const { client_id, category } = await req.json();

  const [{ data: client }, { data: therapist }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", client_id).single(),
    supabase.from("profiles").select("whatsapp").eq("role", "therapist").not("whatsapp", "is", null).limit(1).single(),
  ]);

  if (!therapist?.whatsapp) return new Response("Terapeuta sem WhatsApp cadastrado", { status: 200 });

  const message = `⚠️ Alerta do assistente do portal\n\n${client?.name ?? "Uma cliente"} teve um sinal de ${CATEGORY_LABEL[category] ?? category} numa conversa com o bot.\n\nA cliente já recebeu recursos de emergência (CVV 188) automaticamente. Veja o alerta completo no dashboard.`;

  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: therapist.whatsapp, type: "text", text: { body: message } }),
  });

  return new Response("ok", { status: 200 });
});
```

---

## 9. pg_cron — Agendamento do Resumo de Contexto

```sql
select cron.schedule(
  'bot-context-nightly',
  '0 3 * * *', -- 3h UTC = meia-noite Brasília
  $$
  select net.http_post(
    url := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/generate-bot-context',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 10. Alterações no Frontend

### `ClientChatbot.tsx`
- Antes de abrir o chat, checar `bot_subscriptions.status`. Se não `active`, mostrar um card de upsell
  ("Assine o assistente por R$X/mês") com botão que chama `api/create-checkout-session.ts` e redireciona
  pro `session.url` do Stripe.
- Se a resposta de `/api/chat` vier com status 402, mostrar o mesmo upsell em vez de erro genérico.
- Ao montar o componente, buscar `bot_messages` (RLS já garante que só vem o que é da própria cliente,
  `order by created_at`) e passar como `initialMessages` do `useChat` — sem isso a conversa reseta a cada
  vez que a cliente abre o portal.

**Em aberto — onde colocar a chamada pra assinar:** o upsell dentro do próprio balão de chat (item acima)
só aparece pra quem já clica no ícone flutuante — não é muito visível pra quem não sabe que o bot existe.
Vale decidir, na hora de implementar o frontend desta fase, se também entra um ponto de entrada mais
visível: um card/banner em `ClientHome.tsx`, menção no e-mail/WhatsApp de boas-vindas, ou anúncio pontual
pras clientes já ativas quando a feature for lançada.

### `ClientHome.tsx`
- Novo card "Seu assistente sugeriu uma meta" quando existir `client_goals` com `source='bot'` e
  `confirmed_at is null`. Botões: **Confirmar** (`update confirmed_at = now()`) e **Descartar**
  (`delete`). Ao confirmar, entra no mesmo fluxo de ciclo semanal que as metas manuais já usam.

### `Dashboard.tsx` (terapeuta)
- Badge de alerta por cliente quando existir `bot_risk_alerts` com `acknowledged_at is null` — mesmo
  padrão visual do badge de "Não entendi" da V2.

### `ClientDetail.tsx` (terapeuta)
- Nova seção "Assistente": status da assinatura (`active`/`past_due`/`canceled`), data do último resumo
  de contexto gerado (`client_bot_context.generated_at`), e lista dos alertas de risco com botão "Marcar
  como visto".

---

## 11. Prompt do Bot

```typescript
const SYSTEM_PROMPT = `Você é o assistente do Portal 4D, o espaço de acompanhamento entre sessões dos
clientes da psicoterapeuta Núbia Januzzi, criadora do Protocolo 4D (Detectar, Desacelerar, Decodificar,
Direcionar).

Sua base teórica (uso interno — nunca cite nomes técnicos pra cliente): Terapia do Esquema (Young), ACT
(Hayes), Neurociência do Trauma e do Desenvolvimento Humano (Siegel, van der Kolk), e uma leitura
afirmativa de neurodivergência (TDAH, TEA, altas habilidades) — trate traços neurodivergentes como formas
de funcionar, nunca como déficit ou defeito.

Seu papel, nessa ordem de prioridade:
1. Ajudar a cliente a refletir sobre o que está sentindo/vivendo agora — perguntas abertas, nunca
   diagnóstico ou conclusão fechada.
2. Usar o "Contexto de fundo" (fornecido abaixo) só pra parecer que conhece a pessoa — NUNCA cite, resuma
   ou faça referência direta a esse conteúdo. Fale como alguém que entende o padrão dela, não como quem
   leu uma ficha.
3. Se o assunto que ela trouxer for NOVO — ou seja, não tem nenhuma relação com o que está no "Contexto de
   fundo" — não trate como algo que já é conhecido ou trabalhado na terapia, mesmo que a cliente diga que
   "já falou disso em sessão" (não a corrija por isso, só não finja lembrar de algo que você não tem).
   Nesse caso, SEMPRE, antes de qualquer outra coisa: dê pelo menos 2-3 orientações práticas e concretas
   sobre o tema em si (o que qualquer pessoa bem informada indicaria — ex: estratégias gerais, o que
   costuma ajudar), nunca um protocolo clínico fechado ou definitivo. Só depois disso, oriente a levar o
   assunto pra próxima sessão com a Núbia, explicando o porquê (ex: hábitos e comportamentos assim
   costumam estar ligados a padrões emocionais mais profundos, que ela pode investigar com você de um
   jeito que vai além do que cabe aqui). Não pule direto pra sugerir uma meta sem antes dar essas
   orientações.
4. Quando a conversa indicar claramente que faz sentido, chame a ferramenta proposeGoal com uma meta
   pequena e concreta — você só sugere, a cliente confirma depois na tela dela.
5. Tirar dúvidas administrativas do Portal 4D (como preencher o diário, onde ficam os relatórios).

Escopo — não faça mais nada além disso:
- Você não é terapeuta: não diagnostica, não prescreve, não faz life coaching, não conduz aconselhamento
  de relacionamento além de ajudar a nomear o que a pessoa sente.
- Não substitui a terapia nem antecipa conteúdo que deveria ser trabalhado em sessão com a Núbia.

Protocolo de risco — se a cliente mencionar risco de se machucar, ideação suicida, ou qualquer sinal de
crise: chame a ferramenta flagRisk IMEDIATAMENTE (antes de continuar a resposta), acolha em 1-2 frases, e
oriente com prioridade a procurar a Núbia diretamente ou, em emergência, o CVV (188) ou o serviço de
emergência local. Não continue a conversa como bate-papo comum enquanto isso não for feito.

Seja breve, direto e caloroso. Português do Brasil.`;
```

---

## 12. Ordem de Implementação

```
Fase 0 — Provisionar Stripe ✅ concluída em 2026-08-27 (modo teste)
  [x] Carregar a skill vercel:marketplace e instalar a integração Stripe
      → recurso sandbox `stripe-almond-tree`, conectado ao projeto via Vercel Marketplace
  [x] Criar Product + Price recorrente
      → Product `prod_V9Vmifqy0OHhgH` ("Assistente do Portal 4D")
      → Price `price_1U9ClFPos1yVUu5Z3FwQLP62` — R$1,00/mês (valor de TESTE, trocar antes de produção real)
  [x] Configurar webhook endpoint + copiar STRIPE_WEBHOOK_SECRET
      → endpoint `we_1U9ClYPos1yVUu5Z8ShMPXkI` → `https://nubiajanuzzi.com/api/stripe-webhook`
      → eventos: checkout.session.completed, checkout.session.async_payment_succeeded,
        customer.subscription.updated/deleted, invoice.paid, invoice.payment_failed
        (a lista de eventos foi ampliada em relação ao desenho original da seção 8.2 — inclui
        invoice.paid/invoice.payment_failed por recomendação da skill stripe-best-practices,
        necessários pra pegar renovação e falha de cobrança que o Checkout sozinho não avisa)
      → `STRIPE_WEBHOOK_SECRET` e `STRIPE_BOT_PRICE_ID` já salvos no Vercel (Production/Preview/Development) e no `.env.local`
  [x] npm install stripe

  ⚠️ Pendências antes de ir pra produção real (ver Decisões Técnicas):
  [ ] Trocar o Price de teste (R$1,00) pelo valor real da assinatura
  [ ] Trocar STRIPE_SECRET_KEY (sk_test_) por uma Restricted API Key (rk_) com permissão mínima,
      antes de "claim" do recurso sandbox e de ir pra modo live
  [ ] "Claim" do recurso sandbox no Stripe (`vercel integration resource claim stripe-almond-tree`)
      quando for pra produção de verdade

Fase 1 — Gate de assinatura + memória de conversa
  [ ] Migration: bot_subscriptions
  [ ] Migration: bot_messages
  [ ] api/create-checkout-session.ts
  [ ] api/stripe-webhook.ts
  [ ] api/chat.ts: gravar mensagens em bot_messages (user + onFinish do assistant)
  [ ] ClientChatbot.tsx: checar assinatura, upsell se inativa, carregar histórico como initialMessages
  [ ] Decidir política de retenção de bot_messages (ver Decisões Técnicas)
  [ ] Testar fluxo completo em modo teste do Stripe
  [ ] ⚠️ LEMBRAR: o webhook endpoint (we_1U9ClYPos1yVUu5Z8ShMPXkI) foi apontado temporariamente pra URL
      de preview da branch (`.../api/stripe-webhook`) pra testar o fluxo automático — reverter pra
      `https://nubiajanuzzi.com/api/stripe-webhook` antes ou no momento do merge pra main

Fase 2 — Pipeline de contexto
  [ ] Migration: client_bot_context
  [ ] supabase/functions/generate-bot-context
  [ ] pg_cron: bot-context-nightly
  [ ] api/chat.ts: injetar summary_text no system prompt
  [ ] Rodar manualmente pra 1 cliente de teste e revisar o resumo gerado antes de automatizar pra todo mundo

Fase 3 — Alerta de risco
  [ ] Migration: bot_risk_alerts
  [ ] supabase/functions/notify-therapist-risk (+ BOT_INTERNAL_SECRET)
  [ ] api/chat.ts: tool flagRisk
  [ ] Dashboard.tsx: badge de alerta
  [ ] ClientDetail.tsx: seção de alertas + "marcar como visto"
  [ ] Testar com frase de risco simulada, confirmar WhatsApp chega

Fase 4 — Metas via bot
  [ ] Migration: client_goals.source / confirmed_at
  [ ] api/chat.ts: tool proposeGoal
  [ ] ClientHome.tsx: card de confirmação de meta sugerida
```

---

## 13. Decisões Técnicas

### Por que chamar a Anthropic direto em vez do AI Gateway da Vercel?
O desenho original (e o `api/chat.ts` que já existia antes da V3) usava `model: 'anthropic/claude-haiku-4.5'`
— uma string que o AI SDK resolve automaticamente através do AI Gateway da Vercel. Isso só compensa quando
você usa múltiplos provedores/modelos, quer fallback automático entre eles, ou quer um painel único de
custo pra tudo que usa IA no projeto. Não é o nosso caso: um provedor, um modelo fixo. Na prática, o
Gateway se mostrou uma segunda superfície de billing pra manter (precisa de cartão e saldo *na Vercel*,
separado da conta da Anthropic) sem trazer nenhum benefício real aqui — e isso bloqueou o teste da Fase 1
até resolvermos. Trocado pra `@ai-sdk/anthropic` com a `BOT_ANTHROPIC_API_KEY` dedicada, chamando a
Anthropic direto — mesmo padrão de billing que `generate-monthly-report` e `scripts/test-bot.mjs` já usam.

### Por que Stripe em vez de InfinityPay?
A documentação pública do InfinityPay só cobre checkout avulso (Checkout Integrado / InfiniteTap) — não
achamos API de assinatura recorrente nativa. Construir recorrência por cima de um checkout avulso
(gerar link todo mês, lembrar renovação por WhatsApp) é viável mas é trabalho extra que o Stripe já
resolve nativamente, com integração direta via Vercel Marketplace.

### Por que `STRIPE_SECRET_KEY` (sk_test_) e não uma Restricted API Key (rk_) desde já?
A própria integração do Vercel Marketplace provisiona uma `sk_test_` por padrão, e criar uma RAK exige um
passo manual no Dashboard do Stripe (não dá pra fazer via API por segurança). Pra Fase 0-4, em modo teste
e recurso ainda "sandbox" (não reivindicado), usar a chave provisionada é razoável. **Antes de ir pra
produção real (modo live)**, trocar por uma RAK com permissão mínima (só o necessário pra Checkout
Sessions, Customers, Subscriptions e leitura de eventos de webhook) — boa prática de segurança do Stripe,
reduz o dano possível se a chave vazar.

### Nota sobre imposto (Stripe Tax)
Não configuramos `automatic_tax` — o Stripe não calcula nem cobra nenhum imposto sozinho sem uma
"registration" ativa (e sem isso, ele simplesmente não cobra imposto nenhum, sem avisar). Como é uma
assinatura em BRL pra clientes no Brasil, a situação tributária é diferente do modelo US/EU que o Stripe
Tax cobre nativamente — vale checar com contador/contabilidade se emissão de nota fiscal ou outro
tratamento fiscal brasileiro precisa entrar no fluxo antes de cobrar de verdade (fora do escopo técnico
deste documento).

### Por que o resumo de contexto é um job separado, não algo calculado a cada mensagem?
Resumir sessões inteiras a cada mensagem do chat seria caro (tokens) e arriscado (o modelo de chat, sob
pressão de responder rápido, tem mais chance de "vazar" um trecho literal). Isolar o resumo num prompt
dedicado, rodando 1x por noite, deixa o `api/chat.ts` sempre recebendo um texto já filtrado e curto —
mesma lógica que `generate-monthly-report` já usa pro perfil de esquemas.

### Por que a meta sugerida pelo bot precisa de confirmação em vez de entrar direto?
`client_goals` já tem uma UX inteira de ciclo semanal (7 diários, encerramento com observações) em
`DiaryPage.tsx`. Inserir direto pelo bot ignoraria essa lógica. Marcar como pendente (`confirmed_at =
null`) deixa a cliente no controle de quando uma sugestão vira meta oficial, sem duplicar código.

### Por que `bot_risk_alerts` nunca guarda a transcrição?
A decisão de supervisão foi "terapeuta vê só alertas" — guardar a conversa completa criaria exatamente a
visibilidade que foi descartada. O próprio bot gera o `safe_summary` (categoria + frase curta), o que
também evita que dados sensíveis fiquem armazenados em texto livre desnecessariamente.

### Por que a notificação de risco é uma Edge Function separada, não uma chamada direta pro Graph API dentro de `api/chat.ts`?
As credenciais do WhatsApp (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) já vivem nos secrets do
Supabase, usadas por `whatsapp-send-reminder`/`whatsapp-send-invite`. Duplicar esses segredos também na
Vercel só pra essa chamada aumentaria a superfície de vazamento sem necessidade — mais barato chamar a
Edge Function que já tem acesso a eles.

### Por que `bot_messages` não tem NENHUMA policy pra terapeuta, nem opcional?
Foi descoberto durante teste manual do prompt (rodando `scripts/test-bot.mjs`) que sem persistir as
mensagens, a conversa é perdida a cada refresh — o que force a decidir aqui, de propósito, se a terapeuta
teria acesso a esse histórico. A decisão de "terapeuta vê só alertas" (não a conversa) só é real se for
impossível de contornar no banco — por isso `bot_messages` não tem nenhuma policy que dê acesso a
`role = 'therapist'`, diferente de `bot_subscriptions`/`client_bot_context` que ela pode auditar.

**Em aberto:** por quanto tempo guardar `bot_messages`? Hoje o plano não define expiração — ficaria
armazenado indefinidamente, igual a `diary_entries`/`session_reports`. Como é conteúdo pessoal sensível
(LGPD), vale decidir se isso é aceitável ou se faz sentido um limite de retenção (ex: 90 dias) ou um botão
de "limpar conversa" pra cliente.

---

## 14. Problemas Conhecidos e Mitigações

| Problema | Causa | Mitigação |
|---|---|---|
| Cliente paga mas o chat continua bloqueado | Delay entre `checkout.session.completed` e a UI recarregar `bot_subscriptions` | `success_url` inclui `?bot_assinado=1`; frontend refaz a query ao detectar esse parâmetro, com retry curto (o webhook costuma ser mais rápido que o redirect) |
| Modelo chama `flagRisk` sem necessidade real (falso positivo) | Sensibilidade alta é proposital | Aceitável — melhor um alerta desnecessário do que perder um sinal real. `acknowledged_at` deixa a terapeuta descartar rápido |
| Resumo de contexto genérico demais ou vazando jargão técnico | Prompt do resumidor mal calibrado | Revisar manualmente o resumo gerado pros primeiros clientes (Fase 2) antes de ligar a assinatura pra todo mundo |
| `generate-bot-context` reprocessando cliente sem sessão nova | Cron roda todo dia mesmo sem sessão nova publicada | Aceitável no MVP (custo baixo); se virar problema, adicionar coluna `last_session_report_at` em `client_bot_context` e pular se não mudou desde a última geração |
| Stripe webhook duplicado (retry automático da Stripe) | Stripe reenvia em caso de timeout | `upsert`/`update` por `stripe_subscription_id` já é idempotente — reprocessar o mesmo evento não duplica nada |
| `notify-therapist-risk` chamado sem `BOT_INTERNAL_SECRET` configurado | Variável esquecida no deploy | Função retorna 403 e loga — testar manualmente na Fase 3 antes de considerar pronto |
| Vercel Function em `api/*.ts` sempre retorna 500 (`req.headers.get is not a function`) | Este projeto (`/api` standalone, sem Next.js) espera **named export por método** (`export async function POST(req: Request)`), não `export default async function handler(req)`. Com `default export`, a Vercel invoca a function com a assinatura legada do Node (`req` sem `.headers.get()`). Descoberto na Fase 1 ao testar o checkout em preview — **`api/chat.ts` tinha esse mesmo bug desde antes da V3**, então o chat provavelmente nunca processou uma mensagem real em produção. | Sempre usar `export async function POST(req: Request): Promise<Response>` (ou `GET`, conforme o método), nunca `export default`. Os arquivos que já funcionavam no projeto (`api/inscricao-email.ts`, `api/quiz-result-email.ts`) já seguiam esse padrão — foi só comparar com eles que o bug apareceu. |
| `success_url`/`cancel_url` do Stripe Checkout quebrado em Preview | `VITE_APP_URL` só está configurada no ambiente Production da Vercel — em Preview virava a string literal `"undefined/home"`, e o Stripe rejeitava com `url_invalid` | Montar a URL base a partir do header `Origin` da própria requisição em vez de uma env var fixa — funciona em qualquer ambiente sem configuração extra |
