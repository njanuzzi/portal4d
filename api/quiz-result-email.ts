import { PARECERES, DISCLAIMER_TEXT, FECHAMENTO_TEXT, STAGE_TITLES, STAGES, SESSAO_AVALIACAO_WHATSAPP_LINK } from '../src/lib/quizProtocolo4d.js';
import type { Stage4D } from '../src/lib/quizProtocolo4d.js';

export const config = { runtime: 'nodejs' };

const ZEPTOMAIL_ENDPOINT = 'https://api.zeptomail.com/v1.1/email';

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function buildHtmlBody(name: string, stage: Stage4D): string {
  const parecer = PARECERES[stage];
  const greeting = name ? `Oi, ${name}!` : 'Oi!';

  return `
    <div style="font-family: Georgia, serif; color: #2C2C2C; max-width: 560px; margin: 0 auto;">
      <p style="font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #8a7a3f;">
        Protocolo 4D · Mini Quiz de Triagem
      </p>
      <h1 style="font-size: 22px; margin: 8px 0 16px;">${greeting} Seu retrato agora: ${STAGE_TITLES[stage]}</h1>
      <p style="font-size: 13px; color: #6b6b6b; font-style: italic; margin-bottom: 20px;">${DISCLAIMER_TEXT}</p>
      <p style="line-height: 1.6;">${parecer.intro}</p>
      <p style="line-height: 1.6;"><strong>Hipótese:</strong> ${parecer.hipotese}</p>
      <p style="line-height: 1.6;"><strong>Risco de seguir sem isso:</strong> ${parecer.risco}</p>
      <p style="line-height: 1.6;"><strong>Prática desta semana:</strong> ${parecer.pratica}</p>
      <p style="line-height: 1.6; margin-top: 24px;">${FECHAMENTO_TEXT}</p>
      <p style="margin-top: 20px;">
        <a
          href="${SESSAO_AVALIACAO_WHATSAPP_LINK}"
          style="background: #2c5f5f; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;"
        >
          Quero minha Sessão de Avaliação
        </a>
      </p>
    </div>
  `;
}

export async function POST(req: Request): Promise<Response> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Núbia Januzzi';

  if (!token || !fromEmail) {
    console.error('[quiz-result-email] ZEPTOMAIL_TOKEN ou ZEPTOMAIL_FROM_EMAIL não configurados');
    return new Response('Email sender not configured', { status: 500 });
  }

  let body: { name?: string; email?: string; stage?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { name = '', email = '', stage = '' } = body;

  if (!isValidEmail(email) || !STAGES.includes(stage as Stage4D)) {
    return new Response('Invalid payload', { status: 400 });
  }

  try {
    const zeptoRes = await fetch(ZEPTOMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        // ZEPTOMAIL_TOKEN já vem com o prefixo "Zoho-enczapikey " (é assim que o
        // painel do ZeptoMail exibe/copia o token) — não adicionar de novo aqui.
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { address: fromEmail, name: fromName },
        to: [{ email_address: { address: email, name: name || undefined } }],
        subject: 'Seu retrato simbólico — Protocolo 4D',
        htmlbody: buildHtmlBody(name, stage as Stage4D),
      }),
    });

    if (!zeptoRes.ok) {
      console.error('[quiz-result-email] ZeptoMail error:', await zeptoRes.text());
      return new Response('Failed to send email', { status: 502 });
    }
  } catch (err) {
    console.error('[quiz-result-email] erro de rede:', err);
    return new Response('Failed to send email', { status: 502 });
  }

  return new Response('OK', { status: 200 });
}
