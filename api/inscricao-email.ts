import { SOCIAL_LINKS } from '../src/lib/social.js';
import { ANSWER_LABELS, formatAnswerValue } from '../src/lib/inscricaoAnswers.js';

export const config = { runtime: 'nodejs' };

const ZEPTOMAIL_ENDPOINT = 'https://api.zeptomail.com/v1.1/email';
const CONTATO_EMAIL = 'contato@nubiajanuzzi.com';

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function buildSocialFooterHtml(): string {
  return `
    <p style="font-size: 12px; color: #8a8a8a; margin-top: 32px;">
      <a href="${SOCIAL_LINKS.instagram}" style="color: #9a7a28; text-decoration: none;">Instagram</a>
      &nbsp;·&nbsp;
      <a href="${SOCIAL_LINKS.youtube}" style="color: #9a7a28; text-decoration: none;">YouTube</a>
      &nbsp;·&nbsp;
      <a href="${SOCIAL_LINKS.tiktok}" style="color: #9a7a28; text-decoration: none;">TikTok</a>
    </p>
  `;
}

function buildClientEmailHtml(name: string): string {
  const greeting = name ? `Oi, ${name}!` : 'Oi!';

  return `
    <div style="font-family: Georgia, serif; color: #2C2C2C; max-width: 560px; margin: 0 auto;">
      <p style="font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #8a7a3f;">
        Sessão de Avaliação · Protocolo 4D
      </p>
      <h1 style="font-size: 22px; margin: 8px 0 16px;">${greeting} Sua inscrição foi recebida.</h1>
      <p style="line-height: 1.6;">
        Vou analisar suas respostas com calma e te chamo no WhatsApp em breve pra confirmar os
        próximos passos — seja o agendamento da sessão de avaliação, seja outra indicação, se fizer
        mais sentido para o seu momento.
      </p>
      <p style="line-height: 1.6;">Até breve,<br />Núbia Januzzi</p>
      ${buildSocialFooterHtml()}
    </div>
  `;
}

function buildInternalEmailHtml(
  name: string,
  email: string,
  whatsapp: string,
  answers: Record<string, unknown>
): string {
  const rows = Object.entries(answers)
    .map(
      ([key, value]) => `
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #6b6b6b; font-size: 13px; vertical-align: top; white-space: nowrap;">${ANSWER_LABELS[key] ?? key}</td>
          <td style="padding: 6px 0; font-size: 13px; vertical-align: top;">${formatAnswerValue(value)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="font-family: sans-serif; color: #2C2C2C; line-height: 1.6;">
      <p>Nova inscrição para a sessão de avaliação:</p>
      <ul>
        <li><strong>Nome:</strong> ${name}</li>
        <li><strong>E-mail:</strong> ${email}</li>
        <li><strong>WhatsApp:</strong> ${whatsapp}</li>
      </ul>
      <table style="border-collapse: collapse; margin-top: 12px;">
        ${rows}
      </table>
      <p style="margin-top: 20px; font-size: 13px; color: #6b6b6b;">
        Revise e marque o status no painel de Leads do sistema.
      </p>
    </div>
  `;
}

async function sendEmail(token: string, from: { address: string; name: string }, to: { address: string; name?: string }, subject: string, htmlbody: string) {
  const res = await fetch(ZEPTOMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      // ZEPTOMAIL_TOKEN já vem com o prefixo "Zoho-enczapikey " (é assim que o
      // painel do ZeptoMail exibe/copia o token) — não adicionar de novo aqui.
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [{ email_address: to }],
      subject,
      htmlbody,
    }),
  });
  return res;
}

export async function POST(req: Request): Promise<Response> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'Núbia Januzzi';

  if (!token || !fromEmail) {
    console.error('[inscricao-email] ZEPTOMAIL_TOKEN ou ZEPTOMAIL_FROM_EMAIL não configurados');
    return new Response('Email sender not configured', { status: 500 });
  }

  let body: { name?: string; email?: string; whatsapp?: string; answers?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { name = '', email = '', whatsapp = '', answers = {} } = body;

  if (!isValidEmail(email)) {
    return new Response('Invalid payload', { status: 400 });
  }

  const from = { address: fromEmail, name: fromName };

  try {
    const clientRes = await sendEmail(
      token,
      from,
      { address: email, name: name || undefined },
      'Sua inscrição foi recebida — Sessão de Avaliação',
      buildClientEmailHtml(name)
    );
    if (!clientRes.ok) {
      console.error('[inscricao-email] ZeptoMail error (client):', await clientRes.text());
      return new Response('Failed to send email', { status: 502 });
    }
  } catch (err) {
    console.error('[inscricao-email] erro de rede (client):', err);
    return new Response('Failed to send email', { status: 502 });
  }

  // Notificação interna é best-effort: uma falha aqui não deve fazer a
  // resposta parecer um erro pra quem se inscreveu, já que o e-mail de
  // confirmação (o que importa pra ela) já foi enviado.
  try {
    const internalRes = await sendEmail(
      token,
      from,
      { address: CONTATO_EMAIL, name: 'Núbia Januzzi' },
      `Nova inscrição: ${name}`,
      buildInternalEmailHtml(name, email, whatsapp, answers)
    );
    if (!internalRes.ok) {
      console.error('[inscricao-email] ZeptoMail error (internal):', await internalRes.text());
    }
  } catch (err) {
    console.error('[inscricao-email] erro de rede (internal):', err);
  }

  return new Response('OK', { status: 200 });
}
