# Setup — React/Supabase (live)

## Ympäristö

1. Luo `app/.env.local`:

```bash
VITE_SUPABASE_URL=https://tvkxzczwepfzlbocxqwd.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key Dashboardista>
```

2. Asenna ja käynnistä:

```bash
cd app
npm install
npm run dev
```

## Demotunnukset

| Rooli | Email | Salasana |
|---|---|---|
| Potilas | p@demo.fi | demo12 |
| Lääkäri | l@demo.fi | demo12 |

## AI-proxy (valinnainen)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai-generate
```

Ilman secretia LääkäriPRO käyttää `localDraft`-varaluonnosta.

## Vahva tunnistus (Telia / Signicat) — valmis kytkettäväksi

Ominaisuus on koodattu feature-flagin taakse. Oletuksena nappi näkyy “tulossa”-tilassa.

```bash
# app/.env.local — julkaisussa:
VITE_STRONG_AUTH_ENABLED=true
VITE_STRONG_AUTH_PROVIDER=telia   # tai signicat
VITE_TELIA_OIDC_ISSUER=https://...
VITE_TELIA_OIDC_CLIENT_ID=...
```

Edge Function (token-vaihto):

```bash
supabase secrets set TELIA_OIDC_CLIENT_SECRET=... TELIA_OIDC_ISSUER=... TELIA_OIDC_CLIENT_ID=...
supabase functions deploy strong-auth-exchange
```

Callback-reitti: `/auth/callback`. Provider-vaihto ilman UI-muutoksia: `VITE_STRONG_AUTH_PROVIDER`.

## Stripe-laskutus (LääkäriPRO) — valmis kytkettäväksi

Taulu `billing_subscriptions` + UI `/doctor/billing`. Oletuksena “Tulossa”.

```bash
# app/.env.local — julkaisussa:
VITE_STRIPE_ENABLED=true
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_STARTER=price_...
VITE_STRIPE_PRICE_PRO=price_...
VITE_STRIPE_PRICE_CLINIC=price_...
```

Edge Functions:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook
```

Stripe Dashboard → Webhook URL: `https://<project>.supabase.co/functions/v1/stripe-webhook`  
Eventit: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## Live-skeema

Älä aja `20260904000000_initial_schema.sql` live-projektiin — se kuvaa vanhaa suunnitelmamallia. Käytä Aug 2026 -migraatioita (`20260825*` … `20260828*`) sekä `20260904120000_billing_subscriptions.sql`.
