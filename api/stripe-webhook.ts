import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Na versão atual da API do Stripe, current_period_end não existe mais no topo do objeto Subscription —
// migrou pra dentro de cada item (suporte a assinaturas multi-item). Como só vendemos um único price,
// pegamos direto do primeiro item.
function currentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item ? new Date(item.current_period_end * 1000).toISOString() : null;
}

function mapStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  return 'canceled';
}

async function upsertFromSubscription(subscription: Stripe.Subscription) {
  const clientId = subscription.metadata.client_id;
  if (!clientId) {
    console.error('[stripe-webhook] subscription sem metadata.client_id:', subscription.id);
    return;
  }
  await supabase.from('bot_subscriptions').upsert(
    {
      client_id: clientId,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: mapStatus(subscription.status),
      current_period_end: currentPeriodEnd(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  );
}

export async function POST(req: Request): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook signature inválida: ${err}`, { status: 400 });
  }

  switch (event.type) {
    // Confirmação inicial da assinatura. checkout.session.completed cobre a maioria dos métodos de
    // pagamento; async_payment_succeeded cobre métodos assíncronos (ex: boleto), onde completed já
    // dispara mas ainda sem pagamento confirmado.
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.payment_status === 'paid' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(subscription);
      }
      break;
    }

    // Renovação mensal bem-sucedida — é aqui que current_period_end realmente avança a cada ciclo.
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (subscriptionId) {
        const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
        const subscription = await stripe.subscriptions.retrieve(id);
        await upsertFromSubscription(subscription);
      }
      break;
    }

    // Cobrança falhou — marca past_due; o Stripe já tenta novamente sozinho (dunning) antes de cancelar.
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      if (subscriptionId) {
        const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
        const subscription = await stripe.subscriptions.retrieve(id);
        await upsertFromSubscription(subscription);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertFromSubscription(subscription);
      break;
    }
  }

  return new Response('ok', { status: 200 });
}
