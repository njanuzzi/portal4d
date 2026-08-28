// Testa o prompt do bot do Portal 4D direto no terminal, sem Supabase, sem
// assinatura, sem banco — só pra iterar no system prompt antes de construir
// a infra da V3 (ver TECHNICAL_V3.md).
//
// Uso:
//   BOT_ANTHROPIC_API_KEY=sk-ant-... node scripts/test-bot.mjs
// ou adicione BOT_ANTHROPIC_API_KEY=... no .env.local e rode:
//   node scripts/test-bot.mjs
//
// Usa uma chave separada da ANTHROPIC_API_KEY já existente (usada pelo
// generate-monthly-report) — o bot tem sua própria chave, criada só pra ele
// no console da Anthropic, pra medir custo e uso isoladamente.
//
// Digite as mensagens como se fosse a cliente. Ctrl+C pra sair.

import { createInterface } from 'node:readline/promises';
import { readFileSync, existsSync } from 'node:fs';

function loadEnvLocal() {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
loadEnvLocal();

const API_KEY = process.env.BOT_ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Faltou BOT_ANTHROPIC_API_KEY — adicione no .env.local ou exporte antes de rodar.');
  process.exit(1);
}

const MODEL = process.env.BOT_TEST_MODEL || 'claude-sonnet-5';

// ── Contexto de teste ──
// Lê de scripts/test-bot-context.local (gitignorado via *.local) se existir —
// coloque ali um resumo real de cliente pra testar. Sem esse arquivo, usa um
// placeholder genérico.
const CONTEXT_FILE = 'scripts/test-bot-context.local';
const FAKE_CONTEXT = existsSync(CONTEXT_FILE)
  ? readFileSync(CONTEXT_FILE, 'utf8').trim()
  : `A cliente costuma minimizar o próprio cansaço até que ele vira exaustão. Tende a assumir
responsabilidade por sentimentos alheios e tem dificuldade de pedir ajuda antes de estar no limite. Tem
mostrado progresso em nomear a raiva quando ela aparece, em vez de engoli-la.`;

if (existsSync(CONTEXT_FILE)) console.log(`(usando contexto de ${CONTEXT_FILE})\n`);

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

Seja breve, direto e caloroso. Português do Brasil.

Contexto de fundo (nunca citar literalmente):
${FAKE_CONTEXT}`;

const TOOLS = [
  {
    name: 'proposeGoal',
    description: 'Sugere uma meta pequena e concreta pra cliente confirmar depois — nunca cria a meta direto.',
    input_schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  },
  {
    name: 'flagRisk',
    description: 'Chame IMEDIATAMENTE ao detectar risco de autolesão, ideação suicida ou crise.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['ideacao_suicida', 'autolesao', 'risco_generico'] },
        safe_summary: { type: 'string' },
      },
      required: ['category', 'safe_summary'],
    },
  },
];

async function callClaude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  return res.json();
}

function logToolCalls(blocks) {
  for (const block of blocks) {
    if (block.type !== 'tool_use') continue;
    if (block.name === 'proposeGoal') {
      console.log(`\n🎯 [proposeGoal] "${block.input.text}"\n`);
    } else if (block.name === 'flagRisk') {
      console.log(`\n🚨 [flagRisk] categoria=${block.input.category} — "${block.input.safe_summary}"\n`);
    }
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const messages = [];

console.log(`Testando o bot do Portal 4D (modelo: ${MODEL}). Ctrl+C pra sair.\n`);

while (true) {
  const userText = await rl.question('Você (cliente): ');
  messages.push({ role: 'user', content: userText });

  let response = await callClaude(messages);
  logToolCalls(response.content);

  // Se o modelo chamou uma ferramenta, devolve um resultado fake e deixa ele
  // continuar a resposta em texto normal pra cliente.
  while (response.stop_reason === 'tool_use') {
    messages.push({ role: 'assistant', content: response.content });
    const toolResults = response.content
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: 'ok' }));
    messages.push({ role: 'user', content: toolResults });
    response = await callClaude(messages);
    logToolCalls(response.content);
  }

  messages.push({ role: 'assistant', content: response.content });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  console.log(`\nBot: ${text}\n`);
}
