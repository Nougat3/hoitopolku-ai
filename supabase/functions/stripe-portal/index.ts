// Stripe Customer Portal session.
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!stripeKey || !serviceKey) {
      return new Response(
        JSON.stringify({
          error:
            'stripe-portal ei ole konfiguroitu (STRIPE_SECRET_KEY / SERVICE_ROLE). Valmis kytkettäväksi julkaisussa.'
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
      data: { user }
    } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Virheellinen sessio' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const { data: appUser } = await userClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!appUser) {
      return new Response(JSON.stringify({ error: 'Käyttäjää ei löydy' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: sub } = await admin
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', appUser.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Ei Stripe-asiakasta — tee ensin Checkout-tilaus.' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const returnUrl = String(body.return_url ?? '');
    if (!returnUrl) {
      return new Response(JSON.stringify({ error: 'return_url vaaditaan' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const params = new URLSearchParams();
    params.set('customer', sub.stripe_customer_id);
    params.set('return_url', returnUrl);

    const stripeRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
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
        JSON.stringify({ error: session.error?.message ?? 'Portal epäonnistui' }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
