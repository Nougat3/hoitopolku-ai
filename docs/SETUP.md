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

## Live-skeema

Älä aja `20260904000000_initial_schema.sql` live-projektiin — se kuvaa vanhaa suunnitelmamallia. Käytä Aug 2026 -migraatioita (`20260825*` … `20260828*`).
