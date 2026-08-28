import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const accessToken = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return new Response('Unauthorized', { status: 401 });

  // Base URL a partir da própria requisição, não de uma env var fixa — VITE_APP_URL só existe no
  // ambiente Production da Vercel, então em Preview (e local) success_url/cancel_url viravam
  // "undefined/home", o Stripe rejeitava a sessão, e o erro 500 ficava invisível pro frontend.
  const origin = req.headers.get('origin') ?? `https://${process.env.VERCEL_URL ?? 'localhost:5173'}`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_BOT_PRICE_ID!, quantity: 1 }],
      client_reference_id: userData.user.id,
      customer_email: userData.user.email,
      // client_id fica gravado na própria subscription (não só na sessão de checkout) — os eventos de
      // webhook de renovação/falha (invoice.paid, invoice.payment_failed) chegam com o objeto subscription,
      // não com a checkout session, e precisam saber de quem é sem ter que cruzar por stripe_customer_id.
      subscription_data: { metadata: { client_id: userData.user.id } },
      success_url: `${origin}/home?bot_assinado=1`,
      cancel_url: `${origin}/home`,
    });
  } catch (err) {
    console.error('[create-checkout-session] Falha ao criar sessão Stripe:', err);
    return new Response(JSON.stringify({ error: 'checkout_session_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Response.json({ url: session.url });
}
