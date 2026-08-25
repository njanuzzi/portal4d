# Portal 4D — Documentação Técnica V2

> **Versão:** 2.0  
> **Última atualização:** 2026-05-06  
> **Projeto:** Desbloqueio Comportamental — Integração WhatsApp Business (Meta Cloud API)  
> **Responsável técnico:** Claude (Anthropic) + Núbia Januzzi  
> **Base:** TECHNICAL.md V1.0

---

## Sumário

1. [Visão Geral da V2](#1-visão-geral-da-v2)
2. [Fluxo Completo WhatsApp](#2-fluxo-completo-whatsapp)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Credenciais e Variáveis de Ambiente](#4-credenciais-e-variáveis-de-ambiente)
5. [Banco de Dados — Tabelas Novas](#5-banco-de-dados--tabelas-novas)
6. [Migrations](#6-migrations)
7. [Edge Functions](#7-edge-functions)
8. [pg_cron — Agendamento de Lembretes](#8-pg_cron--agendamento-de-lembretes)
9. [Alterações no Frontend](#9-alterações-no-frontend)
10. [Palavras-chave do Protocolo](#10-palavras-chave-do-protocolo)
11. [Mensagens do Sistema](#11-mensagens-do-sistema)
12. [Ordem de Implementação](#12-ordem-de-implementação)
13. [Decisões Técnicas](#13-decisões-técnicas)
14. [Problemas Conhecidos e Mitigações](#14-problemas-conhecidos-e-mitigações)

---

## 1. Visão Geral da V2

A V2 adiciona integração com **WhatsApp Business via Meta Cloud API** ao Portal 4D.

### O que muda para a terapeuta
- Nova ação na ficha do cliente: **"Enviar ativação WhatsApp"**
- Dashboard exibe status da sessão WA de cada cliente (`Pendente` / `Ativo` / `Pausado`)
- Alerta no dashboard quando cliente responde "Não entendi"

### O que muda para o cliente
- Recebe link WhatsApp de ativação pelo número cadastrado
- Inicia o protocolo mandando uma mensagem pelo link
- Recebe lembretes diários pelo WhatsApp
- Confirma preenchimento do diário pelo WhatsApp

### O que NÃO muda
- Diário é preenchido no portal (não pelo WhatsApp)
- Toda a lógica de diários, metas e relatórios da V1

---

## 2. Fluxo Completo WhatsApp

```
[TERAPEUTA]
Portal → botão "Enviar ativação WA"
    └─→ Edge Function: whatsapp-send-invite
            └─→ Salva registro em whatsapp_sessions (status: pending)
            └─→ Envia link WA para o número do cliente
                Link: wa.me/55<número>?text=Iniciar

[CLIENTE]
Clica no link → WhatsApp abre com "Iniciar" pré-digitado → envia

[SISTEMA — webhook recebe "Iniciar"]
    └─→ Identifica cliente pelo número de telefone
    └─→ Atualiza last_message_at (abre janela 24h)
    └─→ Responde com mensagem de boas-vindas + explicação do protocolo
    └─→ Aguarda resposta

[CLIENTE responde]
    ├── "Entendi"
    │       └─→ status → active
    │       └─→ opted_in_at = now()
    │       └─→ Confirmação enviada
    │       └─→ Aguarda 24h → lembrete diário
    │
    └── "Não entendi"
            └─→ status → paused
            └─→ E-mail enviado para terapeuta (ZeptoMail)
            └─→ Badge de alerta na linha do cliente no dashboard

[LEMBRETE DIÁRIO — pg_cron às 18h UTC / 15h Brasília]
    └─→ Edge Function: whatsapp-send-reminder
            └─→ Busca clientes com status = active
            └─→ Filtra: dentro da janela 24h (last_message_at > now() - interval '24h')
            └─→ Filtra: não preencheram o diário hoje
            └─→ Envia lembrete + link do portal

[CLIENTE preenche o diário no portal]
    └─→ Manda "Respondi" no WhatsApp

[SISTEMA — webhook recebe "Respondi"]
    └─→ Atualiza last_message_at (renova janela 24h)
    └─→ Registra em whatsapp_logs
    └─→ Envia confirmação

[SE CLIENTE NÃO RESPONDER em 24h]
    └─→ Janela fecha — sistema não envia mais mensagens
    └─→ Terapeuta contata pelo número pessoal
    └─→ Cliente responde pelo número Meta → janela reabre → fluxo recomeça
```

---

## 3. Pré-requisitos

### 3.1 Meta / Facebook Developers

| # | O que fazer | Onde |
|---|---|---|
| 1 | Criar app tipo **Business** | developers.facebook.com → Meus Apps → Criar app |
| 2 | Adicionar produto **WhatsApp** ao app | Painel do app → Adicionar produto |
| 3 | Criar/vincular **WhatsApp Business Account (WABA)** | Dentro do produto WhatsApp |
| 4 | Adicionar **número de telefone dedicado** à WABA | WhatsApp → Gerenciar números de telefone |
| 5 | Criar **System User** com função Admin | Meta Business Suite → Configurações → Usuários do sistema |
| 6 | Gerar **token permanente** para o System User | Usuários do sistema → Gerar token → selecionar o app → permissões: `whatsapp_business_messaging`, `whatsapp_business_management` |
| 7 | Configurar **webhook** no app | WhatsApp → Configuração → Webhook → URL da Edge Function + Verify Token |

> ⚠️ **Número dedicado:** não pode ser um número já usado no WhatsApp pessoal ou WhatsApp Business comum. Uma vez vinculado à WABA, é exclusivo da API. Use um chip novo ou número virtual.

> ⚠️ **Token permanente via System User:** tokens de usuário comum expiram em 60 dias. O System User não expira.

### 3.2 Supabase — Extensions necessárias

Verificar e ativar em: **Supabase Dashboard → Database → Extensions**

| Extension | Para que serve | Status esperado |
|---|---|---|
| `pg_cron` | Agendamento do lembrete diário | Ativar se não estiver ativo |
| `pg_net` | Edge Function chamada pelo cron via HTTP | Ativar se não estiver ativo |

### 3.3 Número de telefone — opções

| Opção | Custo estimado | Observação |
|---|---|---|
| Chip novo (operadora brasileira) | ~R$20 único | Mais simples, sem mensalidade |
| Número virtual (SVMobile, VirtualPhone) | ~R$15-30/mês | Sem chip físico, funciona via app |

---

## 4. Credenciais e Variáveis de Ambiente

### Adicionar no Supabase (Dashboard → Edge Functions → Secrets)

```env
WHATSAPP_PHONE_NUMBER_ID=        # ID do número na WABA (ex: 123456789012345)
WHATSAPP_BUSINESS_ACCOUNT_ID=    # ID da WABA
WHATSAPP_ACCESS_TOKEN=           # Token permanente do System User
META_WEBHOOK_VERIFY_TOKEN=       # String secreta que você define (ex: portal4d_wh_2026)
```

### Como encontrar cada credencial

| Credencial | Caminho no painel Meta |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | developers.facebook.com → seu app → WhatsApp → API Setup → Phone Number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Mesmo lugar → WhatsApp Business Account ID |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business Suite → Configurações → Usuários do sistema → seu System User → Gerar token |
| `META_WEBHOOK_VERIFY_TOKEN` | Você cria — qualquer string sem espaços |

---

## 5. Banco de Dados — Tabelas Novas

### `whatsapp_sessions`
Controla o estado de cada cliente no fluxo WhatsApp.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)` |
| `phone` | `text` | Número WA do cliente (formato internacional, ex: `5548999990000`) |
| `status` | `text` | `pending` / `active` / `paused` |
| `opted_in_at` | `timestamptz` | Quando confirmou "Entendi" |
| `last_message_at` | `timestamptz` | Última mensagem recebida — controla janela 24h |
| `last_reminder_at` | `timestamptz` | Último lembrete enviado pelo sistema |
| `invite_sent_at` | `timestamptz` | Quando a terapeuta enviou o link de ativação |
| `created_at` | `timestamptz` | — |

**Status possíveis:**

| Status | Significado |
|---|---|
| `pending` | Link enviado, cliente ainda não mandou "Iniciar" |
| `active` | Cliente confirmou "Entendi" — recebe lembretes |
| `paused` | Cliente respondeu "Não entendi" — aguarda intervenção da terapeuta |

---

### `whatsapp_logs`
Histórico de todas as mensagens trocadas.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid PK` | — |
| `client_id` | `uuid FK` | Referencia `profiles(id)` — pode ser null se número não reconhecido |
| `phone` | `text` | Número do cliente |
| `direction` | `text` | `inbound` (cliente → sistema) / `outbound` (sistema → cliente) |
| `message` | `text` | Conteúdo da mensagem |
| `keyword` | `text` | Palavra-chave reconhecida, se houver (`iniciar`, `entendi`, `nao_entendi`, `respondi`) |
| `created_at` | `timestamptz` | — |

---

## 6. Migrations

### Migration 1 — Criar tabelas WhatsApp

Arquivo: `supabase/migrations/YYYYMMDDHHMMSS_whatsapp_integration.sql`

```sql
-- whatsapp_sessions
create table public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused')),
  opted_in_at timestamptz,
  last_message_at timestamptz,
  last_reminder_at timestamptz,
  invite_sent_at timestamptz,
  created_at timestamptz default now()
);

-- índice para busca por telefone (webhook usa muito)
create unique index whatsapp_sessions_phone_idx on public.whatsapp_sessions(phone);

-- whatsapp_logs
create table public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message text,
  keyword text,
  created_at timestamptz default now()
);

-- RLS: terapeuta vê tudo, cliente não acessa
alter table public.whatsapp_sessions enable row level security;
alter table public.whatsapp_logs enable row level security;

create policy "Therapist full access sessions"
  on public.whatsapp_sessions
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );

create policy "Therapist full access logs"
  on public.whatsapp_logs
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'therapist'
    )
  );
```

---

## 7. Edge Functions

### 7.1 `whatsapp-webhook`

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`  
**Gatilho:** POST enviado pela Meta (toda mensagem recebida)  
**Também responde a:** GET (verificação do webhook pela Meta)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Palavras-chave reconhecidas (normalizado: minúsculo, sem acento)
const KEYWORDS: Record<string, string> = {
  "iniciar": "iniciar",
  "entendi": "entendi",
  "nao entendi": "nao_entendi",
  "não entendi": "nao_entendi",
  "respondi": "respondi",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectKeyword(text: string): string | null {
  const norm = normalize(text);
  return KEYWORDS[norm] ?? null;
}

async function sendMessage(to: string, body: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

async function handleInbound(phone: string, text: string) {
  const keyword = detectKeyword(text);

  // Busca sessão pelo número
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("*, client_id, profiles(name)")
    .eq("phone", phone)
    .maybeSingle();

  // Log da mensagem recebida
  await supabase.from("whatsapp_logs").insert({
    client_id: session?.client_id ?? null,
    phone,
    direction: "inbound",
    message: text,
    keyword,
  });

  // Atualiza janela 24h
  if (session) {
    await supabase
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("phone", phone);
  }

  // Roteamento por palavra-chave
  if (keyword === "iniciar" && session?.status === "pending") {
    const name = (session as any).profiles?.name?.split(" ")[0] ?? "Olá";
    await sendMessage(phone, MESSAGES.welcome(name));
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.welcome(name),
    });
    return;
  }

  if (keyword === "entendi" && session?.status === "pending") {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "active", opted_in_at: new Date().toISOString() })
      .eq("phone", phone);
    await sendMessage(phone, MESSAGES.optinConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.optinConfirmed,
    });
    return;
  }

  if (keyword === "nao_entendi" && session) {
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "paused" })
      .eq("phone", phone);
    // Notifica terapeuta por e-mail
    await notifyTherapist(session);
    await sendMessage(phone, MESSAGES.notUnderstood);
    return;
  }

  if (keyword === "respondi" && session?.status === "active") {
    await sendMessage(phone, MESSAGES.diaryConfirmed);
    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone,
      direction: "outbound",
      message: MESSAGES.diaryConfirmed,
    });
    return;
  }
}

async function notifyTherapist(session: any) {
  // Envia e-mail via ZeptoMail (mesmo padrão da V1)
  // Também cria um alerta na tabela para o dashboard
  await supabase.from("whatsapp_logs").insert({
    client_id: session.client_id,
    phone: session.phone,
    direction: "outbound",
    message: "ALERTA: cliente respondeu Não entendi",
    keyword: "nao_entendi_alert",
  });
  // TODO: integrar com ZeptoMail (mesmo helper da V1)
}

serve(async (req) => {
  // Verificação do webhook pela Meta (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // Mensagens recebidas (POST)
  if (req.method === "POST") {
    const body = await req.json();
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    const messages = entry?.messages;
    if (messages?.length) {
      const msg = messages[0];
      const phone = msg.from;
      const text = msg.text?.body ?? "";
      await handleInbound(phone, text);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Method not allowed", { status: 405 });
});
```

---

### 7.2 `whatsapp-send-reminder`

**Arquivo:** `supabase/functions/whatsapp-send-reminder/index.ts`  
**Gatilho:** pg_cron (diário, 18h UTC = 15h Brasília)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const APP_URL = Deno.env.get("VITE_APP_URL") ?? "https://portal4d.vercel.app";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sendMessage(to: string, body: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

serve(async () => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD UTC

  // Busca sessões ativas dentro da janela de 24h
  const { data: sessions } = await supabase
    .from("whatsapp_sessions")
    .select("*, profiles(name)")
    .eq("status", "active")
    .gte("last_message_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  if (!sessions?.length) {
    return new Response("Nenhuma sessão ativa na janela 24h", { status: 200 });
  }

  for (const session of sessions) {
    // Verifica se o cliente já preencheu o diário hoje
    const { data: entry } = await supabase
      .from("diary_entries")
      .select("id")
      .eq("client_id", session.client_id)
      .eq("date", todayStr)
      .maybeSingle();

    if (entry) continue; // Já preencheu — pula

    // Envia lembrete
    const name = (session as any).profiles?.name?.split(" ")[0] ?? "Olá";
    const message = MESSAGES.reminder(name, APP_URL);
    await sendMessage(session.phone, message);

    // Atualiza last_reminder_at + log
    await supabase
      .from("whatsapp_sessions")
      .update({ last_reminder_at: now.toISOString() })
      .eq("id", session.id);

    await supabase.from("whatsapp_logs").insert({
      client_id: session.client_id,
      phone: session.phone,
      direction: "outbound",
      message,
    });
  }

  return new Response("Lembretes enviados", { status: 200 });
});
```

---

### 7.3 `whatsapp-send-invite`

**Arquivo:** `supabase/functions/whatsapp-send-invite/index.ts`  
**Gatilho:** Ação da terapeuta no portal (botão "Enviar ativação WA")

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WA_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { client_id } = await req.json();

  // Busca perfil do cliente
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, whatsapp")
    .eq("id", client_id)
    .single();

  if (!profile?.whatsapp) {
    return new Response("Cliente sem número WhatsApp cadastrado", { status: 400 });
  }

  // Normaliza número (remove não-dígitos, adiciona DDI se necessário)
  const digits = profile.whatsapp.replace(/\D/g, "");
  const phone = digits.length > 11 ? digits : `55${digits}`;

  // Link de ativação com texto pré-digitado
  const waLink = `https://wa.me/${WA_PHONE_NUMBER_ID_NUMBER}?text=Iniciar`;
  // Nota: WHATSAPP_PHONE_NUMBER_ID é o ID numérico interno da Meta,
  // o número real (ex: 5548...) deve ser salvo em WHATSAPP_DISPLAY_NUMBER

  // Cria ou atualiza sessão
  await supabase
    .from("whatsapp_sessions")
    .upsert({
      client_id,
      phone,
      status: "pending",
      invite_sent_at: new Date().toISOString(),
    }, { onConflict: "phone" });

  // Envia mensagem com o link via API Meta
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: {
        body: MESSAGES.invite(profile.name, waLink),
      },
    }),
  });

  return new Response("Convite enviado", { status: 200 });
});
```

---

## 8. pg_cron — Agendamento de Lembretes

Executar no **SQL Editor do Supabase** após ativar as extensions:

```sql
-- Ativa pg_cron (se ainda não estiver ativo)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendamento: todos os dias às 18h UTC (15h horário de Brasília)
select cron.schedule(
  'whatsapp-diary-reminder',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/whatsapp-send-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para verificar agendamentos ativos:
select * from cron.job;

-- Para remover o agendamento (se necessário):
select cron.unschedule('whatsapp-diary-reminder');
```

> ⚠️ Substituir `<SEU_PROJECT_REF>` e `<SUPABASE_SERVICE_ROLE_KEY>` pelos valores reais.

---

## 9. Alterações no Frontend

### 9.1 Nova variável de ambiente (Vercel + `.env.local`)

```env
VITE_WHATSAPP_DISPLAY_NUMBER=5548XXXXXXXXX   # Número real da WABA (para montar o wa.me link)
```

### 9.2 `ClientDetail.tsx` — nova seção WhatsApp

Adicionar abaixo das informações do cliente:

- **Status da sessão WA:** badge `Pendente` / `Ativo` / `Pausado`
- **Botão "Enviar ativação WhatsApp":** chama a Edge Function `whatsapp-send-invite`
  - Desabilitado se não houver número cadastrado no perfil
  - Desabilitado se status já for `active`
- **Data do último opt-in** (`opted_in_at`)
- **Data do último lembrete enviado** (`last_reminder_at`)

### 9.3 `Dashboard.tsx` — novo badge de alerta

Na linha de cada cliente, exibir badge de alerta quando:
- `whatsapp_sessions.status = 'paused'` (cliente respondeu "Não entendi")

Comportamento: igual ao badge de "dias sem atividade" já existente na V1.

### 9.4 `DiaryPage.tsx` — botão de confirmação WhatsApp (opcional)

Após o cliente submeter o diário com sucesso, exibir:

```
✅ Diário preenchido!
Confirme pelo WhatsApp para manter o protocolo ativo.
[Confirmar no WhatsApp]  ← abre wa.me/<número>?text=Respondi
```

---

## 10. Palavras-chave do Protocolo

| Cliente envia | Sistema reconhece como | Ação disparada |
|---|---|---|
| `Iniciar` | `iniciar` | Envia boas-vindas + explicação do protocolo |
| `Entendi` | `entendi` | Confirma opt-in, status → active |
| `Não entendi` / `Nao entendi` | `nao_entendi` | Status → paused, alerta para terapeuta |
| `Respondi` | `respondi` | Confirma preenchimento do diário |

**Regras de normalização:**
- Minúsculo
- Sem acento (NFD + remoção de diacríticos)
- Sem espaços extras

---

## 11. Mensagens do Sistema

```typescript
// Centralizar em: supabase/functions/_shared/messages.ts

export const MESSAGES = {
  // Enviada após "Iniciar"
  welcome: (name: string) =>
    `Olá, ${name}! 👋\n\nBem-vinda ao protocolo de acompanhamento do seu diário de Desbloqueio Comportamental.\n\nTodos os dias você receberá uma mensagem por aqui lembrando de preencher seu diário. Depois de preencher, é só responder *Respondi* para confirmar.\n\nSe em algum momento não responder, as mensagens pausam automaticamente — e retomam quando você mandar qualquer mensagem por aqui.\n\nVocê entendeu como funciona?\n\n👉 Responda *Entendi* para começar\n👉 Responda *Não entendi* se precisar de ajuda`,

  // Enviada após "Entendi"
  optinConfirmed:
    `Ótimo! ✅ Seu lembrete diário está ativado.\n\nA partir de agora você receberá uma mensagem todos os dias para preencher seu diário. Qualquer dúvida, sua terapeuta está à disposição.`,

  // Enviada após "Não entendi"
  notUnderstood:
    `Sem problema! 🙂 Sua terapeuta será avisada e entrará em contato para explicar melhor.`,

  // Lembrete diário
  reminder: (name: string, appUrl: string) =>
    `Oi, ${name}! 📋\n\nSeu diário de hoje ainda não foi preenchido.\n\nAcesse aqui: ${appUrl}\n\nDepois é só responder *Respondi* para confirmar. 💙`,

  // Enviada após "Respondi"
  diaryConfirmed:
    `Registrado! ✅ Obrigada por manter seu protocolo em dia. Até amanhã! 💙`,

  // Convite enviado pela terapeuta
  invite: (name: string, link: string) =>
    `Olá, ${name}! 👋\n\nSua terapeuta ativou o acompanhamento pelo WhatsApp para o seu Protocolo 4D.\n\nClique no link abaixo para começar:\n${link}\n\nO link já deixa a mensagem pronta — é só enviar! 😊`,
};
```

---

## 12. Ordem de Implementação

```
Fase 1 — Infraestrutura Meta
  [ ] Criar app no Facebook Developers (tipo Business)
  [ ] Adicionar produto WhatsApp
  [ ] Vincular WABA + número dedicado
  [ ] Criar System User + gerar token permanente
  [ ] Salvar as 4 credenciais no Supabase (Secrets)

Fase 2 — Banco de dados
  [ ] Ativar pg_cron e pg_net no Supabase
  [ ] Rodar migration das tabelas whatsapp_sessions e whatsapp_logs

Fase 3 — Edge Functions
  [ ] Criar _shared/messages.ts com todas as mensagens
  [ ] Criar e fazer deploy de whatsapp-webhook
  [ ] Configurar webhook no painel Meta (URL + Verify Token)
  [ ] Testar verificação GET do webhook
  [ ] Criar e fazer deploy de whatsapp-send-invite
  [ ] Criar e fazer deploy de whatsapp-send-reminder

Fase 4 — Agendamento
  [ ] Configurar pg_cron no SQL Editor
  [ ] Verificar agendamento com select * from cron.job

Fase 5 — Frontend
  [ ] ClientDetail.tsx: status WA + botão de ativação
  [ ] Dashboard.tsx: badge de alerta para status paused
  [ ] DiaryPage.tsx: botão "Confirmar no WhatsApp" pós-submit

Fase 6 — Testes end-to-end
  [ ] Enviar ativação para número de teste
  [ ] Simular fluxo completo: Iniciar → Entendi → lembrete → Respondi
  [ ] Simular fluxo "Não entendi" → verificar alerta no dashboard + e-mail
  [ ] Simular janela 24h fechada → confirmar que lembrete não é enviado
```

---

## 13. Decisões Técnicas

### Por que não usar templates da Meta?
A terapeuta nunca inicia conversa fria — sempre o cliente abre o canal. Isso elimina a necessidade de templates aprovados (com custo por conversa iniciada pela empresa) e simplifica toda a arquitetura.

### Por que janela de 24h controlada por `last_message_at`?
A Meta só permite envio de mensagens livres (não-template) dentro de 24h após a última mensagem do cliente. `last_message_at` rastreia esse ponto de referência. O cron verifica antes de enviar.

### Por que `upsert` em `whatsapp_sessions` com `onConflict: phone`?
Permite reenviar o link de ativação para o mesmo cliente sem duplicar a sessão — apenas atualiza `invite_sent_at` e mantém o histórico.

### Por que normalizar palavras-chave (NFD + lowercase)?
Evita falhas por variações de digitação: "Não entendi", "nao entendi", "NÃO ENTENDI" são todas reconhecidas.

### Por que `_shared/messages.ts`?
Centraliza todas as mensagens em um único arquivo — facilita edição de conteúdo sem precisar alterar lógica das funções.

---

## 14. Problemas Conhecidos e Mitigações

| Problema | Causa | Mitigação |
|---|---|---|
| Webhook não verificado pela Meta | URL incorreta ou Verify Token divergente | Checar URL da Edge Function no painel Supabase + confirmar variável `META_WEBHOOK_VERIFY_TOKEN` |
| Token expirando | Uso de token de usuário em vez de System User | Sempre usar System User para gerar o token permanente |
| Número já usado no WA pessoal | Vinculação indevida à WABA | Usar número dedicado nunca usado em WA pessoal/Business comum |
| Lembrete enviado fora da janela 24h | `last_message_at` desatualizado | Filtro no cron garante `last_message_at > now() - interval '24h'` antes de enviar |
| Cliente sem número cadastrado | Campo `whatsapp` vazio em `profiles` | Botão de ativação desabilitado no frontend quando sem número; validação na Edge Function |
| pg_cron não disponível | Extension não ativada | Ativar via Dashboard → Database → Extensions → pg_cron |
| `.catch is not a function` em chamadas Supabase | `PostgrestBuilder` não é Promise nativa (herdado da V1) | Usar `.then(() => {}, () => {})` em todas as chamadas RPC |
