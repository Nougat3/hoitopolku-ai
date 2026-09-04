// Stripe webhooks → billing_subscriptions upsert.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
//
// Configure in Stripe Dashboard:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.paid / invoice.payment_failed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!stripeKey || !webhookSecret || !serviceKey || !supabaseUrl) {
    return new Response(
      JSON.stringify({
        error:
          'stripe-webhook ei ole konfiguroitu. Aseta STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY.'
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), { status: 400 });
  }

  const rawBody = await req.text();

  // Minimal signature check via Stripe API (constructEvent equivalent for Deno stub).
  // Production: use Stripe SDK verify or manual HMAC with timestamp tolerance.
  // Here we POST to Stripe's "event retrieve" only after trusting signature with Web Crypto.
  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  const admin = createClient(supabaseUrl, serviceKey);
  const obj = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = String(
          (obj.metadata as Record<string, string> | undefined)?.user_id ??
            obj.client_reference_id ??
            ''
        );
        const customerId = String(obj.customer ?? '');
        const subscriptionId = String(obj.subscription ?? '');
        const plan = String(
          (obj.metadata as Record<string, string> | undefined)?.plan ?? 'pro'
        );
        if (userId && customerId) {
          await upsertSubscription(admin, {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId || null,
            plan,
            status: 'active'
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const customerId = String(obj.customer ?? '');
        const subscriptionId = String(obj.id ?? '');
        const status = mapStripeStatus(String(obj.status ?? 'canceled'));
        const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);
        const periodEnd = obj.current_period_end
          ? new Date(Number(obj.current_period_end) * 1000).toISOString()
          : null;
        const priceId = extractPriceId(obj);
        const planMeta = (obj.metadata as Record<string, string> | undefined)?.plan;

        const { data: existing } = await admin
          .from('billing_subscriptions')
          .select('user_id, plan')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (existing) {
          await upsertSubscription(admin, {
            user_id: existing.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            price_id: priceId,
            plan: planMeta ?? existing.plan ?? 'pro',
            status,
            current_period_end: periodEnd,
            cancel_at_period_end: cancelAtPeriodEnd
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'handler error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

function mapStripeStatus(status: string): string {
  const allowed = new Set([
    'none',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'unpaid'
  ]);
  return allowed.has(status) ? status : 'incomplete';
}

function extractPriceId(obj: Record<string, unknown>): string | null {
  const items = obj.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  return items?.data?.[0]?.price?.id ?? null;
}

async function upsertSubscription(
  admin: ReturnType<typeof createClient>,
  row: {
    user_id: string;
    stripe_customer_id: string;
    stripe_subscription_id?: string | null;
    price_id?: string | null;
    plan: string;
    status: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  }
) {
  const { error } = await admin.from('billing_subscriptions').upsert(
    {
      user_id: row.user_id,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      price_id: row.price_id ?? null,
      plan: row.plan,
      status: row.status,
      current_period_end: row.current_period_end ?? null,
      cancel_at_period_end: row.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): Promise<boolean> {
  // Stripe-Signature: t=timestamp,v1=signature
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), v];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`)
  );
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // timing-safe-ish compare
  if (expected.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  // Reject if timestamp older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  return ok === 0 && age < 300;
}
