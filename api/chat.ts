import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAnthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText, tool, type ModelMessage, type UIMessage } from 'ai';
import { z } from 'zod';

export const config = { runtime: 'nodejs' };

// Depois desse tanto de horas sem mensagem, a próxima conversa não reenvia mais o histórico antigo pro
// modelo — sem isso, cada mensagem reenviaria a conversa inteira desde sempre, crescendo o custo e a
// latência de forma ilimitada. O histórico continua salvo e visível pra cliente (ClientChatbot.tsx
// carrega tudo), só o que vai pro modelo é que fica limitado à janela atual.
const CONTEXT_WINDOW_HOURS = 4;

// Chave dedicada ao bot (separada da ANTHROPIC_API_KEY usada pelo fechamento mensal) — chama a
// Anthropic direto, sem passar pelo AI Gateway da Vercel (que exigiria saldo/billing à parte só
// pra essa chamada, sem nenhum benefício real já que só usamos um provedor/modelo fixo aqui).
const anthropic = createAnthropic({ apiKey: process.env.BOT_ANTHROPIC_API_KEY });

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
4. Quando a conversa indicar claramente que faz sentido — a cliente descreveu um padrão específico que
   quer mudar, ou pediu ajuda com algo concreto — chame a ferramenta proposeGoal com uma meta pequena,
   simples e concreta (algo que dê pra observar/tentar em poucos dias). Você só sugere; a cliente confirma
   ou descarta depois na tela dela. Não proponha meta em toda conversa — só quando fizer sentido de
   verdade, no máximo uma por conversa.
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

interface DiaryQuestionRow {
  text: string | null;
}

interface EntryAnswerRow {
  answer_text: string | null;
  answer_value: string | null;
  diary_questions: DiaryQuestionRow | DiaryQuestionRow[] | null;
}

function questionText(row: EntryAnswerRow): string {
  const q = Array.isArray(row.diary_questions) ? row.diary_questions[0] : row.diary_questions;
  return q?.text ?? 'Pergunta';
}

// Busca só a janela de conversa atual (desde a última pausa maior que CONTEXT_WINDOW_HOURS), não o
// histórico inteiro. Limita a busca às últimas 200 mensagens como teto de segurança — uma única janela
// contínua maior que isso é um caso extremo que fica pra tratar depois (ex: com resumo automático).
async function getContextWindow(supabase: SupabaseClient, clientId: string): Promise<ModelMessage[]> {
  const { data } = await supabase
    .from('bot_messages')
    .select('role, content, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as { role: 'user' | 'assistant'; content: string; created_at: string }[]).reverse();

  let windowStart = 0;
  for (let i = 1; i < rows.length; i++) {
    const gapHours = (new Date(rows[i].created_at).getTime() - new Date(rows[i - 1].created_at).getTime()) / 3_600_000;
    if (gapHours > CONTEXT_WINDOW_HOURS) windowStart = i;
  }

  return rows.slice(windowStart).map((row) => ({ role: row.role, content: row.content }));
}

export async function POST(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Server misconfigured', { status: 500 });
  }

  // Scoped to the caller's own JWT — never the service role key — so every
  // query below runs under the same RLS policies as the rest of the app and
  // can only ever return this client's own rows.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const clientId = userData.user.id;

  // profiles.role é a fonte de verdade usada no resto do app (AuthContext.tsx, AppRoutes) — nem toda
  // conta de cliente tem user_metadata.role setado (depende de qual fluxo criou a conta), então checar
  // isso ali gerava 403 pra clientes legítimas.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', clientId).maybeSingle();
  if (profile?.role !== 'client') {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: subscription } = await supabase
    .from('bot_subscriptions')
    .select('status')
    .eq('client_id', clientId)
    .maybeSingle();
  if (subscription?.status !== 'active') {
    return new Response(JSON.stringify({ error: 'subscription_required' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  // Grava a mensagem que acabou de chegar da cliente (a última do array) — sem isso a conversa
  // some ao recarregar a página, porque o useChat só guarda mensagens na memória do navegador.
  const lastUserMessage = messages[messages.length - 1];
  const lastUserText = lastUserMessage.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
  if (lastUserText) {
    await supabase.from('bot_messages').insert({ client_id: clientId, role: 'user', content: lastUserText });
  }

  const { data: context } = await supabase
    .from('client_bot_context')
    .select('summary_text')
    .eq('client_id', clientId)
    .maybeSingle();
  const backgroundContext = context?.summary_text || 'Sem histórico ainda — essa é uma das primeiras conversas.';

  const today = new Date().toISOString().slice(0, 10);
  const { data: entry } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('date', today)
    .maybeSingle();

  let diaryContext = 'O cliente ainda não preencheu o diário de hoje.';
  if (entry) {
    const { data: answers } = await supabase
      .from('entry_answers')
      .select('answer_text, answer_value, diary_questions(text)')
      .eq('entry_id', (entry as { id: string }).id);

    const rows = (answers ?? []) as EntryAnswerRow[];
    if (rows.length > 0) {
      diaryContext = `Entrada de diário de hoje (${today}):\n${rows
        .map((a) => `- ${questionText(a)}: ${a.answer_text ?? a.answer_value ?? '(sem resposta)'}`)
        .join('\n')}`;
    }
  }

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: `${SYSTEM_PROMPT}\n\nContexto de fundo (nunca citar literalmente):\n${backgroundContext}\n\nContexto do diário da cliente:\n${diaryContext}`,
    messages: await getContextWindow(supabase, clientId),
    // Sem isso, o streamText para depois de 1 passo por padrão — se esse passo for a tool flagRisk, a
    // cliente nunca receberia o texto de acolhimento/CVV que deveria vir logo em seguida.
    stopWhen: stepCountIs(4),
    tools: {
      proposeGoal: tool({
        description: 'Sugere uma meta pequena e concreta pra cliente confirmar depois — nunca cria a meta direto, só propõe.',
        inputSchema: z.object({ text: z.string().max(300) }),
        execute: async ({ text }) => {
          // client_goals usa "user_id", não "client_id" (nome herdado da V1) — source='bot' e
          // confirmed_at=null deixam isso como proposta pendente, não como meta oficial ainda
          // (ClientHome.tsx mostra o card de aceitar/descartar; DiaryPage.tsx e ClientHome.tsx
          // ignoram propostas não confirmadas ao buscar "a meta atual").
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
          // Fire-and-forget — não bloqueia a resposta de acolhimento/crise pra cliente por causa de
          // uma falha de e-mail; o alerta já está gravado em bot_risk_alerts de qualquer jeito.
          fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/notify-therapist-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Bot-Internal-Secret': process.env.BOT_INTERNAL_SECRET! },
            body: JSON.stringify({ client_id: clientId, category, safe_summary }),
          }).catch((err) => console.error('[api/chat] Falha ao chamar notify-therapist-risk:', err));
          return { ok: true };
        },
      }),
    },
    onFinish: async ({ text }) => {
      if (text) {
        await supabase.from('bot_messages').insert({ client_id: clientId, role: 'assistant', content: text });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
