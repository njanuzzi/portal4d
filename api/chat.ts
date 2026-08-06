import { createClient } from '@supabase/supabase-js';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export const config = { runtime: 'nodejs' };

const SYSTEM_PROMPT = `Você é o assistente do Portal 4D, o espaço de acompanhamento entre sessões dos
clientes da psicoterapeuta Núbia Januzzi, criadora do Protocolo 4D (Detectar, Desacelerar, Decodificar,
Direcionar).

Seu papel, nessa ordem de prioridade:
1. Ajudar o cliente a refletir sobre a entrada de diário de hoje, quando ela existir (ver contexto abaixo)
   — faça perguntas abertas, não dê diagnósticos nem conclusões prontas.
2. Dar apoio pontual entre sessões — acolher, ajudar a nomear o que a pessoa está sentindo, sem tentar
   substituir a terapia.
3. Tirar dúvidas administrativas sobre o Portal 4D (como preencher o diário, onde ficam os relatórios, etc.).

Regras importantes:
- Você não é terapeuta e não faz diagnóstico clínico, prescrição ou interpretação definitiva.
- Se o cliente mencionar risco de se machucar, ideação suicida, ou qualquer sinal de crise, interrompa o
  fluxo normal: acolha em 1-2 frases e oriente com prioridade a procurar a Núbia diretamente ou, em
  emergência, o CVV (188) ou o serviço de emergência local — não continue a conversa como se fosse um
  bate-papo comum.
- Seja breve, direto e caloroso. Português do Brasil.`;

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

export default async function handler(req: Request): Promise<Response> {
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
  const role = userData.user.user_metadata?.role ?? userData.user.app_metadata?.role;
  if (role !== 'client') {
    return new Response('Forbidden', { status: 403 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

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
    model: 'anthropic/claude-haiku-4.5',
    system: `${SYSTEM_PROMPT}\n\nContexto do diário do cliente:\n${diaryContext}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
