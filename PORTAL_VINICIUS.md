# Portal Vinicius Santucci — Especificação Completa

> **Versão:** 2.0 (substitui a v1.0 — escopo ampliado após conversa com a Núbia em 2026-08-28)
> **Status:** plano — nada foi executado ainda. Este documento é auto-suficiente: pode ser aberto numa
> sessão nova do Claude Code sem depender do histórico da conversa onde foi escrito.
> **Responsável técnico:** Claude (Anthropic) + Núbia Januzzi

---

## 1. O que é isto

Réplica do Portal4D (`njanuzzi/portal4d`) pro Vinicius Santucci, terapeuta parceiro, usando o **mesmo
código-fonte** mas **infraestrutura 100% isolada** (banco e deploy próprios) — nenhum dado dele se mistura
com o da Núbia, e vice-versa.

**Pessoa:** Vinicius Santucci — `vinicius.santucci@gmail.com`
**Domínio:** `viniciussantucci.com.br` (já registrado por ele, precisa só apontar DNS pra Vercel)

## 2. Por que infraestrutura separada, não multi-tenant

Já foi decidido explicitamente com a Núbia: o sistema hoje **não tem isolamento entre terapeutas** — toda
política de RLS checa só `role = 'therapist'`, não "esse terapeuta é dono desse cliente". Fazer multi-tenant
de verdade exigiria reescrever RLS de ~20 tabelas, criar uma camada de admin, e resolver que WhatsApp/
Stripe hoje são recursos de conta única (um número, uma conta) — um projeto grande e arriscado por si só,
que mexeria no banco de produção real da Núbia. **Não fazer isso agora.** Se um 3º terapeuta aparecer no
futuro, aí sim vale parar e desenhar multi-tenant direito. Por ora: instância separada, código
compartilhado (assim dá pra levar melhorias de um lado pro outro copiando arquivos, sem duplicar o
trabalho de desenvolvimento).

## 3. Escopo

| Módulo | Status | Observação |
|---|---|---|
| Inventário de Esquemas (formulário público, cálculo, relatório técnico + devolutiva do cliente) | **Obrigatório** — é o motivo desse projeto existir | |
| Área de membros (diário, metas, sessões, relatórios de fechamento) | **Incluído, mas opcional de uso** — "ele usa se quiser" | Não precisa funcionar perfeito no dia 1, mas não deve dar erro se ele clicar |
| WhatsApp Business (lembretes, ManyChat) | **Desabilitado** | Ele não vai usar — precisa ficar escondido da UI, não só "sem configurar" (ver seção 6) |
| Bot de IA + assinatura Stripe | **Fora do escopo por enquanto** | Envolve a conta Stripe da Núbia — cobrar clientes dele pela conta dela seria misturar receita de dois negócios. Se um dia ele quiser isso, precisa da própria conta Stripe (ver seção 9, decisão em aberto) |
| Biblioteca 4D / Blog (`content_articles`) | Fora do escopo | Feature nova da Núbia, não pedida pra ele |
| Agendamento (Cal.com) | Incluído no schema, mas inerte até ele configurar o próprio webhook Cal.com | |
| Notion sync de sessões | Fora do escopo por enquanto | Depende da conta Notion da Núbia — se ele quiser, precisa da própria integração Notion |

## 4. Arquitetura

- **GitHub:** mesmo repositório (`njanuzzi/portal4d`), sem fork.
- **Vercel:** projeto novo. Recomendação: criar dentro da conta/team atual da Núbia (é onde esta sessão
  já tem acesso pra provisionar direto) — dá pra transferir titularidade pra uma conta do Vinicius depois,
  se fizer sentido; Vercel suporta transferência de projeto.
- **Supabase:** projeto novo, mesma lógica de titularidade acima. Nome sugerido: `PortalVinicius`,
  região **South America (São Paulo)** (mais perto do Brasil que a região da Núbia, que ficou em Oregon
  por herança do setup original).
- **Domínio:** `viniciussantucci.com.br` apontado pro projeto Vercel novo (mesmo processo já usado pro
  domínio da Núbia).

## 5. Banco de dados

### 5.1 Como replicar o schema

**Não existe** hoje um jeito de "rodar todas as migrations do zero e ter o banco pronto" — várias tabelas
centrais (`profiles`, `diaries`, `client_schema_reports`, `schema_domains` e outras) foram criadas direto
no painel do Supabase em algum momento, sem migration rastreada no git. O jeito confiável de replicar:

1. No projeto de origem (`ojmaxsskczukdbxpaull`), rodar `list_tables` (verbose) pra pegar colunas, tipos,
   defaults, checks e foreign keys de cada tabela da lista abaixo.
2. Rodar uma query em `pg_policies` pra pegar o texto exato de cada política de RLS dessas tabelas.
3. Reconstruir `CREATE TABLE` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` no projeto
   novo, replicando exatamente o que foi lido (não adivinhar campos).
4. **Não existe** trigger `handle_new_user` (o `CLAUDE.md` do repositório está desatualizado nesse
   ponto) — cada Edge Function de cadastro já cria a linha em `profiles` no próprio código. Não precisa
   replicar trigger nenhum.

### 5.2 Tabelas a criar

**Núcleo (obrigatório):**
`profiles`, `schema_domains`, `schema_questions`, `schema_vulnerability_modes`, `client_assessments`,
`client_schema_scores`, `client_schema_reports`, `client_published_reports`, `report_observations`

**Área de membros (incluído, uso opcional):**
`diaries`, `diary_questions`, `diary_entries`, `entry_answers`, `day_notes`, `reports`, `session_reports`,
`client_goals`, `client_tokens`, `client_invites`, `client_signup_feedback`, `push_subscriptions`,
`scheduling_contacts`, `appointments`, `leads`

**Excluídas de propósito (ver seção 3):**
`whatsapp_sessions`, `whatsapp_logs`, `bot_conversations` (WhatsApp — desabilitado), `bot_subscriptions`,
`bot_messages`, `client_bot_context`, `bot_risk_alerts` (bot/Stripe — fora de escopo), `content_articles`
(Biblioteca 4D — não pedida), `financas_*` (ferramenta pessoal da Núbia, sem relação com terapia)

### 5.3 Dados de referência a copiar (conteúdo, não estrutura)

`schema_domains` (16 linhas), `schema_questions` (205 linhas), `schema_vulnerability_modes` (16 linhas) —
são o conteúdo do questionário em si (nomes dos esquemas, texto de cada pergunta). Copiar com um `SELECT`
no projeto de origem gerando `INSERT` pro projeto novo — é dado, não é algo que se "recria", tem que ser
exatamente igual.

Opcional: copiar também `diaries`/`diary_questions` (o diário padrão) se ele quiser começar a área de
membros já com um diário pronto — ou deixar em branco pra ele (ou a Núbia) montar o próprio depois.

### 5.4 Conta do Vinicius

Depois do banco pronto, seguir exatamente o processo que já está documentado no `CLAUDE.md` da Núbia:
criar o usuário via Supabase Dashboard (Authentication → Users) com `vinicius.santucci@gmail.com`, depois

```sql
UPDATE profiles SET role = 'therapist', name = 'Vinicius Santucci' WHERE email = 'vinicius.santucci@gmail.com';
```

## 6. Esconder o WhatsApp da interface

Como o WhatsApp fica desabilitado, os pontos da UI abaixo precisam ficar escondidos (não só "quebrados
por falta de configuração"):

| Onde | O que esconder |
|---|---|
| `ClientDetail.tsx` | Seção inteira de status/ativação WhatsApp |
| `Dashboard.tsx` | Ícone/link de "Enviar lembrete via WhatsApp" na lista de clientes do dia |
| `NotificationSettings.tsx` (cliente) | Toggles de opt-in de WhatsApp (diário/agendamento/geral) |
| `ClientSignup.tsx` / telas de cadastro | Campo de WhatsApp pode continuar existindo (é só um dado de contato), mas nenhuma automação deve tentar usá-lo |

**Implementação recomendada:** uma flag de build simples, `VITE_WHATSAPP_ENABLED` (env var), lida nesses
componentes pra decidir se renderiza aquele pedaço de UI. Default `true` (nada muda pro portal da Núbia),
`false` no `.env`/Vercel do projeto do Vinicius. É uma mudança pequena e localizada — não precisa de um
sistema de feature-flag mais sofisticado pra isso.

Como as Edge Functions de WhatsApp/ManyChat não seriam nem duplicadas nesse projeto (ver seção 7), não
tem risco de alguém acionar automação nenhuma mesmo se algum botão escapar sem essa flag.

## 7. Edge Functions

### 7.1 Duplicar (com ajuste de branding)

| Função | Ajuste necessário |
|---|---|
| `schema-assessment-start` | E-mail de notificação de novo cadastro: trocar `contato@nubiajanuzzi.com` → e-mail do Vinicius; nome do remetente "Portal Núbia Januzzi" → algo equivalente com o nome dele |
| `schema-assessment-save` | Nenhum (pura lógica de cálculo) |
| `generate-technical-report` | Nenhum (prompt já genérico — "supervisor clínico especializado em Terapia do Esquema", sem nome) |
| `revise-technical-report` | Nenhum (mesmo motivo) |
| `generate-client-report` | Nenhum (prompt já genérico — "voz sistêmica", sem nome do terapeuta) |
| `revise-client-report` | Ainda não lido o conteúdo — conferir antes de duplicar, mas os outros dois do mesmo par (`generate-client-report`) são genéricos, é provável que este também seja |
| `send-report-observation` | **Precisa de ajuste** — hoje tem hardcoded: `THERAPIST_FALLBACK_EMAIL = "contato@nubiajanuzzi.com"`, `recipientName = "Núbia"`, `APP_URL` fallback `sistema.nubiajanuzzi.com`. Trocar os três pros equivalentes do Vinicius |

### 7.2 Duplicar só se a área de membros for usada de verdade

`generate-monthly-report`, `send-diary-reminder-emails`, `send-diary-fill-reminder-emails`,
`send-push-notifications`, `cal-webhook`, `client-self-signup`, `tally-client-signup` — nenhum tem
branding bloqueante conhecido, mas não são urgentes pro núcleo (questionário). Pode ficar pra quando ele
decidir ativar diário/agendamento.

### 7.3 Não duplicar

`whatsapp-webhook`, `whatsapp-send-reminder`, `whatsapp-send-invite`, `whatsapp-manychat-webhook`,
`manychat-register-subscriber` (WhatsApp desabilitado), `sync-notion-sessions`,
`import-esmeralda-test-sessions` (específico de teste da Núbia), `tally-schema-webhook` (só se ele também
usar Tally, o que exige conta própria dele — decidir depois se for o caso).

## 8. Frontend

Rotas envolvidas no núcleo obrigatório:
- **Pública:** `/questionario-esquemas`
- **Terapeuta:** `/schema-respostas`, `/schema-respostas/:assessmentId`, `/clients/:id/schema-analysis`,
  `/clients/:id/schema-analysis/report/:reportId`, `.../cliente` (preview da devolutiva)

**Ajustes de branding:**
- `SchemaQuestionnaire.tsx`: duas ocorrências de `alt="Núbia Januzzi"` numa imagem — precisa da foto do
  Vinicius pra substituir (arquivo de imagem dele ainda não recebido).
- Conferir o texto de boas-vindas/consentimento LGPD do formulário linha a linha antes de publicar —
  varredura rápida não achou texto assinado como Núbia, mas vale ler com calma.

**Feature nova, ainda não existe no sistema:** botão de baixar/exportar o relatório (técnico e/ou
devolutiva do cliente). Hoje as telas só mostram o conteúdo pra leitura na tela — não tem exportação.
Decisão pendente: PDF de verdade (mais trabalho) ou usar o "Imprimir → Salvar como PDF" do navegador
(zero código novo, funciona hoje)? Ver seção 9.

## 9. Decisões que a Núbia precisa confirmar antes de começar a construir

1. **Botão de baixar relatório** — vira uma função de exportar PDF de verdade, ou o "Imprimir do
   navegador" já resolve por enquanto?
2. **Cliente do Vinicius precisa de login?** — pelo que foi descrito ("ele baixa e envia pro cliente"),
   o cliente nunca acessaria o próprio relatório pelo portal. Confirma esse entendimento?
3. **Chave da Anthropic** — reaproveita a `ANTHROPIC_API_KEY` já usada pela Núbia (mesma conta, custo
   junto), ou cria uma dedicada pro Vinicius (mede custo separado)?
4. **ZeptoMail** — mesma conta de e-mail transacional da Núbia, ou ele tem/vai criar uma própria? Se for
   a mesma conta, os e-mails saem de `noreply@nubiajanuzzi.com` mesmo sendo conteúdo dele — pode soar
   estranho pro cliente dele receber um e-mail de domínio de outra terapeuta.
5. **Foto/logo do Vinicius** — arquivo de imagem pra trocar no formulário público.
6. **Bot/Stripe no futuro** — se um dia ele quiser o assistente de IA também, vai precisar da própria
   conta Stripe (não dá pra cobrar os clientes dele pela conta da Núbia). Só uma nota pro futuro, não
   bloqueia nada agora.
7. **Titularidade Vercel/Supabase** — nasce nas contas da Núbia (mais simples de provisionar agora,
   transferível depois), ou já nasce em contas do próprio Vinicius (exige acesso dele agora)?

## 10. Credenciais e variáveis de ambiente

**Vercel (projeto novo):**
```env
VITE_SUPABASE_URL=              # do projeto Supabase novo
VITE_SUPABASE_ANON_KEY=         # do projeto Supabase novo
VITE_APP_URL=https://viniciussantucci.com.br
VITE_WHATSAPP_ENABLED=false
```

**Supabase (projeto novo, Edge Functions Secrets):**
```env
SUPABASE_SERVICE_ROLE_KEY=      # gerado automaticamente pelo próprio projeto
ANTHROPIC_API_KEY=              # ver decisão #3
ZEPTOMAIL_API_KEY=              # ver decisão #4
APP_URL=https://viniciussantucci.com.br   # usado por send-report-observation
```

## 11. Ordem de execução proposta

```
Fase 0 — Infra
  [ ] Criar projeto Supabase novo (região São Paulo)
  [ ] Criar projeto Vercel novo, ligado ao mesmo repositório
  [ ] Apontar DNS de viniciussantucci.com.br pro projeto Vercel

Fase 1 — Banco (núcleo obrigatório)
  [ ] Introspeccionar as 9 tabelas do núcleo no projeto de origem (colunas + RLS)
  [ ] Recriar essas 9 tabelas + RLS no projeto novo
  [ ] Copiar os dados de referência (16 domínios + 205 perguntas + 16 modos)
  [ ] Criar a conta do Vinicius (auth + profiles.role='therapist')

Fase 2 — Banco (área de membros, opcional)
  [ ] Introspeccionar e recriar as 15 tabelas de área de membros + RLS
  [ ] Decidir se copia um diário padrão ou deixa em branco

Fase 3 — Backend
  [ ] Duplicar as Edge Functions da seção 7.1, com os ajustes de branding
  [ ] Conferir o conteúdo de revise-client-report antes de duplicar
  [ ] (Se for usar área de membros) duplicar as functions da seção 7.2

Fase 4 — Frontend
  [ ] Implementar VITE_WHATSAPP_ENABLED e esconder os 3 pontos da seção 6
  [ ] Trocar foto/alt text no formulário público (aguardando arquivo do Vinicius)
  [ ] Implementar exportação de relatório (PDF ou print, conforme decisão #1)

Fase 5 — Teste ponta a ponta
  [ ] Preencher o formulário de teste
  [ ] Gerar relatório técnico + devolutiva do cliente
  [ ] Confirmar e-mail de notificação chegando pro Vinicius (não pra Núbia)
  [ ] Validar exportação/download do relatório
  [ ] Confirmar que nenhum ponto de WhatsApp aparece na interface
```
