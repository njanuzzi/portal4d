# Plano: Assistente Terapêutico via WhatsApp (Protocolo 4D)

> **Objetivo:** Transformar o webhook do WhatsApp já existente num assistente terapêutico inteligente que identifica a cliente, busca as sessões anotadas no Notion e conversa com acolhimento — recebendo e enviando texto e áudio.

---

## Contas e acessos necessários (faça isso primeiro)

### ✅ Já tem
- [ ] **Meta / WhatsApp Business API** — número ativo, token e phone_number_id já configurados
- [ ] **Supabase** — projeto com webhook functions rodando
- [ ] **Vercel** — deploy do portal funcionando

### 🔑 Precisa criar ou ativar

| Plataforma | Para quê | Link | Custo estimado |
|---|---|---|---|
| **Anthropic (Claude API)** | Raciocínio terapêutico do bot | [platform.anthropic.com](https://platform.anthropic.com) | ~$0,003/msg (Sonnet) |
| **Notion** | Buscar anotações de sessões das clientes | [notion.so](https://www.notion.so) — Settings → Integrations | Grátis (plano atual) |
| **OpenAI** | Transcrever áudios recebidos (Whisper) | [platform.openai.com](https://platform.openai.com) | ~$0,006/min de áudio |
| **ElevenLabs** *(opcional)* | Enviar respostas em áudio com voz natural | [elevenlabs.io](https://elevenlabs.io) | Grátis até 10k chars/mês |

> **Dica:** Anthropic e OpenAI pedem cartão de crédito para gerar API keys. O gasto real para uma única terapeuta com poucas clientes é de centavos por mês.

---

## Pré-requisitos técnicos

Antes de qualquer código, configure:

### 1. Notion — estrutura do banco de sessões

Crie (ou adapte) um **Database** no Notion com estas propriedades:

| Propriedade | Tipo | Exemplo |
|---|---|---|
| `Nome da Sessão` | Title | "Sessão 12 — Ana" |
| `Cliente` | Select ou Text | "Ana Silva" |
| `Data` | Date | 2025-04-10 |
| `Temas` | Multi-select | ansiedade, família, trabalho |
| `Humor da cliente` | Select | estável / agitado / melhor |
| `Anotações` | Body da página | texto livre da sessão |

> O bot vai buscar todas as páginas onde `Cliente = nome da cliente` e usar como contexto para o Claude.

### 2. Variáveis de ambiente (adicionar no Supabase e Vercel)

```
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=secret_...
NOTION_SESSIONS_DB_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OPENAI_API_KEY=sk-...          # para transcrição de áudio (Fase 2)
```

**Como obter cada uma:**
- `ANTHROPIC_API_KEY` → platform.anthropic.com → API Keys → Create Key
- `NOTION_API_KEY` → notion.so → Settings → My Integrations → New Integration → copiar "Internal Integration Token" → compartilhar o Database com a integração
- `NOTION_SESSIONS_DB_ID` → abrir o Database no Notion → copiar o ID da URL (parte entre `/` e `?`)
- `OPENAI_API_KEY` → platform.openai.com → API Keys

---

## Arquitetura do sistema

```
Cliente manda msg (texto ou áudio)
         │
         ▼
 whatsapp-webhook (já existe)
         │
         ├─ É keyword? (iniciar/entendi/etc.) → fluxo atual (não muda)
         │
         └─ É conversa livre + sessão ativa?
                   │
                   ▼
        handleBotConversation()  ← NOVO
                   │
         ┌─────────┴──────────┐
         │                    │
   Busca histórico      Busca sessões
   bot_conversations    Notion API
   (últimas 10 msgs)    (todas as sessões
                         desta cliente)
         │                    │
         └─────────┬──────────┘
                   │
                   ▼
           Claude Sonnet 4.6
           (com system prompt
            terapêutico)
                   │
                   ▼
           sendMessage() → cliente
```

---

## Fase 1 — Bot de texto com Claude + Notion

**Estimativa:** 2–3 horas de implementação

### 1.1 Nova tabela no Supabase

```sql
create table bot_conversations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references profiles(id),
  phone       text not null,
  role        text check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz default now()
);

create index on bot_conversations (phone, created_at desc);
```

> Execute no SQL Editor do Supabase.

### 1.2 Nova Supabase Function: `notion-fetch-sessions`

- Recebe `{ client_name: string }`
- Consulta o Database do Notion filtrando por `Cliente = client_name`
- Retorna texto formatado com todas as sessões (data + temas + anotações)
- Usado dentro do webhook como contexto para o Claude

### 1.3 Estender `whatsapp-webhook/index.ts`

Adicionar no final do `handleInbound()`:

```typescript
// Se não é keyword e sessão está ativa → modo conversa com IA
if (!keyword && resolvedSession?.status === "active") {
  await handleBotConversation(phone, text, resolvedSession);
  return;
}
```

### 1.4 Implementar `handleBotConversation()`

```typescript
async function handleBotConversation(phone, text, session) {
  // 1. Salvar mensagem da cliente
  // 2. Buscar últimas 10 msgs do bot_conversations
  // 3. Buscar sessões do Notion para esta cliente
  // 4. Montar prompt: system + sessões + histórico + msg atual
  // 5. Chamar Claude API (claude-sonnet-4-6)
  // 6. Salvar resposta no bot_conversations
  // 7. Enviar resposta via sendMessage()
}
```

### 1.5 System prompt terapêutico

```
Você é uma assistente de apoio terapêutico do Protocolo 4D, criado pela
psicoterapeuta [NOME]. Você tem acesso às anotações das sessões desta cliente.

Diretrizes obrigatórias:
- Nunca faça diagnósticos
- Nunca substitua ou imite a terapeuta
- Sempre acolha com empatia antes de orientar
- Se a cliente demonstrar crise ou risco, diga para entrar em contato
  com a terapeuta imediatamente e ligue para o CVV (188)
- Quando não souber responder, diga que vai avisar a terapeuta
- Responda sempre em português, de forma calorosa e direta
- Máximo de 3 parágrafos por resposta
```

---

## Fase 2 — Receber e transcrever áudio

**Estimativa:** 2 horas

### 2.1 Detectar mensagem de áudio no webhook

```typescript
// Hoje: const text = msg.text?.body ?? "";
// Novo:
let text = msg.text?.body ?? "";
if (msg.type === "audio") {
  text = await transcribeAudio(msg.audio.id);
}
```

### 2.2 `transcribeAudio(mediaId)`

1. `GET https://graph.facebook.com/v19.0/{mediaId}` com token Meta → retorna `url` do arquivo
2. Download do arquivo OGG/AAC (stream)
3. `POST https://api.openai.com/v1/audio/transcriptions` com o arquivo + `model: "whisper-1"` + `language: "pt"`
4. Retorna o texto transcrito

> Após a transcrição, o fluxo é idêntico ao de texto — passa pela mesma `handleBotConversation()`.

---

## Fase 3 — Resposta em áudio (opcional)

**Estimativa:** 1 hora

### 3.1 TTS com OpenAI

```typescript
const mp3 = await fetch("https://api.openai.com/v1/audio/speech", {
  body: JSON.stringify({ model: "tts-1", voice: "nova", input: resposta })
});
// Fazer upload do MP3 para Meta Media API → enviar como audio message
```

> Recomendação: implementar somente se as clientes preferirem áudio. Texto funciona melhor para arquivar e relembrar.

---

## Fase 4 — Controle no portal (painel da terapeuta)

**Estimativa:** 1 hora

### 4.1 Toggle "Assistente IA ativo" por cliente

- Adicionar coluna `bot_enabled boolean default false` na tabela `whatsapp_sessions`
- Exibir toggle na tela `ClientDetail.tsx`
- Webhook só chama `handleBotConversation()` se `bot_enabled = true`

### 4.2 Alerta "precisa de atenção humana"

- Se Claude retornar resposta com flag de incerteza ou crise, inserir em `whatsapp_logs` com `keyword = 'needs_human'`
- Exibir badge de alerta no dashboard da terapeuta

---

## Checklist de início

```
PRÉ-CÓDIGO
[ ] Criar conta Anthropic e gerar ANTHROPIC_API_KEY
[ ] Criar conta OpenAI e gerar OPENAI_API_KEY
[ ] Criar Integration no Notion e compartilhar o Database de sessões
[ ] Copiar NOTION_SESSIONS_DB_ID da URL do Database
[ ] Adicionar as 4 variáveis de ambiente no Supabase (Functions → Secrets)

BANCO DE DADOS
[ ] Executar SQL da tabela bot_conversations no Supabase

CÓDIGO (ordem recomendada)
[ ] Fase 1.2 — notion-fetch-sessions function
[ ] Fase 1.3 + 1.4 — handleBotConversation no webhook
[ ] Testar com texto manualmente
[ ] Fase 2 — suporte a áudio
[ ] Fase 4 — toggle no portal
[ ] Fase 3 — resposta em áudio (se decidir implementar)
```

---

## Custos estimados (cenário real: 5 clientes ativas, 10 msgs/dia cada)

| Serviço | Volume/mês | Custo estimado |
|---|---|---|
| Claude Sonnet (input + output) | ~150k tokens | ~$0,45 |
| OpenAI Whisper | ~30 min de áudio | ~$0,18 |
| Notion API | ilimitado | Grátis |
| **Total** | | **< $1/mês** |

---

*Documento criado em 08/05/2026 — Portal 4D*
