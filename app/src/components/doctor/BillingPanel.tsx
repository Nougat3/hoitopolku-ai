import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BILLING_PLANS,
  BillingDisabledError,
  BillingNotConfiguredError,
  fetchMySubscription,
  getStripeConfig,
  isStripeReady,
  openCustomerPortal,
  startCheckout,
  type BillingPlanId,
  type BillingSubscription
} from '@/lib/billing';
import { formatDate } from '@/utils/formatting';

interface BillingPanelProps {
  compact?: boolean;
}

export function BillingPanel({ compact = false }: BillingPanelProps) {
  const cfg = getStripeConfig();
  const [sub, setSub] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<BillingPlanId | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchMySubscription();
        if (!cancelled) setSub(row);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Tilauksen haku epäonnistui');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!cfg.enabled && !cfg.showComingSoon) return null;

  const live = isStripeReady();
  const active =
    sub && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due');

  async function onCheckout(plan: BillingPlanId) {
    if (!cfg.enabled) {
      toast('Stripe-laskutus kytketään päälle tuotantojulkaisussa.');
      return;
    }
    setBusyPlan(plan);
    try {
      await startCheckout(plan);
    } catch (err) {
      if (err instanceof BillingDisabledError || err instanceof BillingNotConfiguredError) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : 'Checkout epäonnistui');
      }
      setBusyPlan(null);
    }
  }

  async function onPortal() {
    setBusyPlan('pro');
    try {
      await openCustomerPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Portal epäonnistui');
      setBusyPlan(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold">LääkäriPRO-tilaus</h3>
          <p className="text-sm text-[var(--mid)] mt-0.5">
            {cfg.enabled
              ? live
                ? 'Maksa Stripe Checkoutilla. Hallitse korttia Customer Portalissa.'
                : 'Odottaa Stripe Price ID:itä / publishable keytä.'
              : 'Laskutus tulossa — pohja valmis kytkettäväksi julkaisussa.'}
          </p>
        </div>
        {!cfg.enabled && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--g0)] text-[var(--mid)]">
            Tulossa
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--mid)]">Ladataan tilausta…</p>
      ) : active ? (
        <div className="rounded-xl bg-[var(--green-t)] p-3 mb-3">
          <p className="font-semibold text-[var(--green)] capitalize">
            {sub!.plan} · {sub!.status}
          </p>
          {sub!.current_period_end && (
            <p className="text-sm text-[var(--mid)] mt-1">
              Kausi päättyy {formatDate(new Date(sub!.current_period_end))}
              {sub!.cancel_at_period_end ? ' (peruutus kauden lopussa)' : ''}
            </p>
          )}
          <button
            type="button"
            className="btn-secondary mt-3"
            disabled={busyPlan !== null || !cfg.enabled}
            onClick={() => void onPortal()}
          >
            Hallitse laskutusta
          </button>
        </div>
      ) : (
        <p className="text-sm text-[var(--mid)] mb-3">Ei aktiivista tilausta.</p>
      )}

      {!compact && (
        <div className="grid gap-3 sm:grid-cols-3">
          {BILLING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-[var(--line)] p-3 flex flex-col"
            >
              <div className="font-bold">{plan.name}</div>
              <div className="text-2xl font-extrabold mt-1">
                {plan.priceEur} €
                <span className="text-sm font-medium text-[var(--mid)]">/kk</span>
              </div>
              <p className="text-xs text-[var(--mid)] mt-2 flex-1">{plan.blurb}</p>
              <ul className="mt-2 space-y-1 text-xs text-[var(--mid)]">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`mt-3 w-full ${
                  live ? 'btn-primary' : 'btn-secondary opacity-80'
                }`}
                disabled={busyPlan !== null}
                onClick={() => void onCheckout(plan.id)}
              >
                {busyPlan === plan.id
                  ? 'Avataan…'
                  : cfg.enabled
                    ? live
                      ? 'Tilaa'
                      : 'Odottaa Stripea'
                    : 'Tulossa'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
