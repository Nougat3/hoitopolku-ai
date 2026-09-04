// Create Stripe Checkout Session for LääkäriPRO plans.
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY (optional for customer upsert)
// Returns 501 until STRIPE_SECRET_KEY is set.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error:
            'stripe-checkout ei ole konfiguroitu (STRIPE_SECRET_KEY). Ominaisuus on valmis kytkettäväksi julkaisussa.'
        }),
        { status: 501, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Kirjautuminen vaaditaan' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const {
      data: { user },
      error: userErr
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Virheellinen sessio' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const priceId = String(body.price_id ?? '');
    const plan = String(body.plan ?? 'pro');
    const successUrl = String(body.success_url ?? '');
    const cancelUrl = String(body.cancel_url ?? '');
    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'price_id, success_url ja cancel_url vaaditaan' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve app user id for metadata
    const { data: appUser } = await userClient
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!appUser || (appUser.role !== 'laakari' && appUser.role !== 'yllapito')) {
      return new Response(JSON.stringify({ error: 'Vain lääkärit voivat tilata Pro-paketin' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.set('client_reference_id', appUser.id);
    params.set('customer_email', appUser.email ?? user.email ?? '');
    params.set('line_items[0][price]', priceId);
    params.set('line_items[0][quantity]', '1');
    params.set('metadata[user_id]', appUser.id);
    params.set('metadata[plan]', plan);
    params.set('subscription_data[metadata][user_id]', appUser.id);
    params.set('subscription_data[metadata][plan]', plan);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message ?? 'Stripe Checkout epäonnistui' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
