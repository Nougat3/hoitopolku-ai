# Hoitopolku.ai

Potilaan ja lääkärin välinen hoitoseurantasovellus — verenpaine, verensokeri, paino ja lääkitys yhdessä paikassa.

---

## Nykytila

**React + Supabase -tuotantosovellus** (`app/`) on kytketty live-projektiin `hoitopolku-ai` (EU). HTML-demot säilyvät referenssinä.

| Kerros | Tila |
|---|---|
| Auth (Supabase) | Valmis — roolit `potilas` / `laakari` |
| Potilas: mittaukset, käyrät, oireet, tehtävät, jakokoodi | Valmis |
| LääkäriPRO: istunnot, koodin lunastus, lääkitys, AI-luonnos | Valmis |
| Realtime | Valmis (mittaukset, lääkkeet, istunnot…) |
| PWA | Valmis (`vite-plugin-pwa`) |
| AI Edge Function | Koodi valmis (`supabase/functions/ai-generate`); ilman `ANTHROPIC_API_KEY`-secretia käytetään paikallista luonnosta |

### Demotunnukset

- Potilas: `p@demo.fi` / `demo12`
- Lääkäri: `l@demo.fi` / `demo12`

---

## Pika-aloitus (React)

```bash
cd app
cp .env.example .env.local
# Täytä VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Avaa http://localhost:3000

```bash
npm run type-check
npm test -- --run
npm run build
```

---

## Rakenne

```
app/src/
  components/   # shared, patient, doctor
  hooks/        # auth + patient data + realtime
  lib/          # supabase client, AI localDraft + proxy
  pages/        # Login, patient/doctor dashboards
  types/        # live-skeeman TypeScript-tyypit
  utils/        # rolling, project, graph, formatting
supabase/
  migrations/   # live-skeema (Aug 2026)
  functions/ai-generate/
docs/
  TECH_MIGRATION_PLAN.md
  MIGRATION_ROADMAP.md
  SETUP.md
```

**Tärkeää:** live-tietomalli käyttää tauluja `users`, `bp_measurements`, `metric_measurements`, `patient_medications`, `care_sessions`, `patient_access_codes` jne. — ei Sep 4 -suunnitelman `profiles` / `care_paths` -mallia.

---

## HTML-demot

- `hoitopolku-demo.html`, `laakaripro.html`, `index.html`
- Live: [nougat3.github.io/hoitopolku-ai](https://nougat3.github.io/hoitopolku-ai/)

---

## Dokumentaatio

- [`docs/TECH_MIGRATION_PLAN.md`](docs/TECH_MIGRATION_PLAN.md)
- [`docs/MIGRATION_ROADMAP.md`](docs/MIGRATION_ROADMAP.md)
- [`docs/SETUP.md`](docs/SETUP.md)
