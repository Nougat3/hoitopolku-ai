import { getStripeConfig, isStripeReady } from '@/lib/billing/config';
import {
  BillingDisabledError,
  BillingNotConfiguredError,
  type BillingPlanId,
  type BillingSubscription
} from '@/lib/billing/types';
import { supabase, handleSupabaseError } from '@/lib/supabase';

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

export async function fetchMySubscription(): Promise<BillingSubscription | null> {
  const { data, error } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Table may not exist yet in older envs
    if (error.code === '42P01' || error.message.includes('billing_subscriptions')) {
      return null;
    }
    throw new Error(handleSupabaseError(error));
  }
  return (data as BillingSubscription | null) ?? null;
}

/**
 * Start Stripe Checkout for a plan. Redirects to Stripe when Edge Function is live.
 */
export async function startCheckout(plan: BillingPlanId): Promise<void> {
  const cfg = getStripeConfig();
  if (!cfg.enabled) throw new BillingDisabledError();
  if (!isStripeReady()) throw new BillingNotConfiguredError();

  const priceId = cfg.priceIds[plan];
  if (!priceId) throw new BillingNotConfiguredError();

  const origin = window.location.origin;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
    {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({
        plan,
        price_id: priceId,
        success_url: `${origin}${cfg.successPath}`,
        cancel_url: `${origin}${cfg.cancelPath}`
      })
    }
  );

  if (res.status === 501 || res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ??
        'Stripe Checkout odottaa secret-avaimia. Ominaisuus on valmis kytkettäväksi.'
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Checkout epäonnistui (${res.status})`);
  }

  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error('Checkout-URL puuttuu vastauksesta');
  window.location.assign(json.url);
}

/** Open Stripe Customer Portal for payment method / cancel. */
export async function openCustomerPortal(): Promise<void> {
  const cfg = getStripeConfig();
  if (!cfg.enabled) throw new BillingDisabledError();

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-portal`,
    {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({
        return_url: `${window.location.origin}/doctor/billing`
      })
    }
  );

  if (res.status === 501 || res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ?? 'Stripe Portal odottaa konfiguraatiota (customer + secret).'
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Portal epäonnistui (${res.status})`);
  }

  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error('Portal-URL puuttuu');
  window.location.assign(json.url);
}

export { getStripeConfig, isStripeReady } from '@/lib/billing/config';
export { BILLING_PLANS, BillingDisabledError, BillingNotConfiguredError } from '@/lib/billing/types';
export type { BillingPlanId, BillingSubscription, BillingPlan } from '@/lib/billing/types';
