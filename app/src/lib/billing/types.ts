/**
 * Stripe billing foundation — feature-flagged.
 * Secret keys live only in Edge Functions, never in Vite.
 */

export type BillingPlanId = 'starter' | 'pro' | 'clinic';

export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid';

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  blurb: string;
  /** Display price EUR / month (marketing). Real charge uses Stripe Price ID. */
  priceEur: number;
  features: string[];
}

export interface BillingSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  plan: BillingPlanId;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
  created_at: string;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    blurb: 'Yksittäiselle lääkärille — peruspotilaslista ja jakokoodit.',
    priceEur: 29,
    features: ['Jakokoodit', 'Potilasnäkymä', 'AI-luonnos (localDraft)']
  },
  {
    id: 'pro',
    name: 'Pro',
    blurb: 'Aktiiviseen vastaanottoon — Realtime ja laajempi käyttö.',
    priceEur: 79,
    features: ['Kaikki Starterissa', 'Realtime-synkronointi', 'Prioriteettituki']
  },
  {
    id: 'clinic',
    name: 'Klinikka',
    blurb: 'Tiimille — useampi lääkäri saman organisaation alla.',
    priceEur: 199,
    features: ['Kaikki Prossa', 'Useampi lääkäri', 'Laskutus organisaatiolle']
  }
];

export class BillingDisabledError extends Error {
  constructor() {
    super('Stripe-laskutus on poistettu käytöstä (VITE_STRIPE_ENABLED).');
    this.name = 'BillingDisabledError';
  }
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super(
      'Stripe ei ole vielä konfiguroitu. Lisää Price ID:t ja Edge Function -secretit julkaisussa.'
    );
    this.name = 'BillingNotConfiguredError';
  }
}
