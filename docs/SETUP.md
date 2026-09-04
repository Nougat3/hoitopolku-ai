# Hoitopolku & LääkäriPRO — Setup-ohje
## Projektin pystytys ja kehitysympäristö

Tämä ohje kuvaa askel askeleelta, miten saat Hoitopolun React/Supabase-sovelluksen käyntiin paikallisesti ja tuotantoon.

---

## Esivalmistelut

### Tarvittavat työkalut

- **Node.js** 18.x tai uudempi ([nodejs.org](https://nodejs.org/))
- **pnpm** tai **npm** (pnpm suositeltu: `npm install -g pnpm`)
- **Git** ([git-scm.com](https://git-scm.com/))
- **Supabase CLI** (valinnainen, mutta suositeltu: `npm install -g supabase`)
- **Vercel CLI** (tuotantoon deployaamiseen: `npm install -g vercel`)

### Tarvittavat tilit

1. **Supabase-tili** (ilmainen taso riittää kehitykseen)
   - [supabase.com/dashboard](https://supabase.com/dashboard)
   - Luo uusi projekti **EU (Frankfurt)** -alueelle (GDPR-vaatimus)

2. **Vercel-tili** (ilmainen taso riittää)
   - [vercel.com](https://vercel.com/)
   - Yhdistä GitHub-tiliisi automaattista deployausta varten

3. **Anthropic-tili** (LääkäriPRO AI-apurille)
   - [console.anthropic.com](https://console.anthropic.com/)
   - Luo API-avain (huom: tämä säilytetään **vain** palvelimella)

---

## Vaihe 1: Kloonaa repositorio ja asenna riippuvuudet

```bash
# Kloonaa repo
git clone https://github.com/your-org/hoitopolku-ai.git
cd hoitopolku-ai

# Asenna riippuvuudet React-sovellukseen
cd app
pnpm install  # tai: npm install
```

---

## Vaihe 2: Supabase-projektin pystytys

### 2.1 Luo projekti Supabase Dashboardissa

1. Mene [supabase.com/dashboard](https://supabase.com/dashboard)
2. Paina "New project"
3. **Tärkeää:** Valitse **Region: Frankfurt** (eu-central-1)
4. Anna projektille nimi, esim. "hoitopolku-dev"
5. Tallenna tietokantasalasana turvallisesti (tarvitset sitä myöhemmin)

### 2.2 Aja migraatiot

#### Vaihtoehto A: Supabase Dashboardin kautta (helpoin)

1. Mene **SQL Editor** -välilehdelle
2. Kopioi sisältö tiedostosta [`supabase/migrations/20260904000000_initial_schema.sql`](../supabase/migrations/20260904000000_initial_schema.sql)
3. Liitä se SQL-editoriin ja paina "Run"
4. Toista sama seed-datalle: [`supabase/migrations/20260904000001_seed_data.sql`](../supabase/migrations/20260904000001_seed_data.sql)

#### Vaihtoehto B: Supabase CLI:n kautta (edistynyt)

```bash
# Kirjaudu Supabaseen
supabase login

# Linkitä projekti
supabase link --project-ref your-project-ref

# Aja migraatiot
supabase db push
```

### 2.3 Tarkista RLS (Row Level Security)

Mene **Authentication > Policies** -välilehdelle ja varmista, että:
- Kaikissa tauluissa on RLS päällä (toggle vihreänä)
- Jokaisen taulun alla näkyy listatut policyt

Jos policyt puuttuvat, aja initial_schema.sql uudelleen.

### 2.4 Luo testikäyttäjiä

**Tärkeää:** Seed-datan käyttäjät ovat esimerkkejä. Sinun täytyy luoda oikeat käyttäjät Supabase Authiin.

1. Mene **Authentication > Users**
2. Luo kaksi käyttäjää:

**Lääkäri:**
- Email: `anna.lehtinen@example.com`
- Password: (valitse vahva salasana)
- Kopioi käyttäjän `id` (UUID)
- Mene **SQL Editor** ja aja:

```sql
-- Korvaa <user-id> kopioidulla UUID:lla
INSERT INTO public.profiles (id, role, full_name, phone) 
VALUES ('<user-id>', 'doctor', 'Anna Lehtinen', '+358401234567');

INSERT INTO public.doctors (user_id, medical_title, specialization) 
VALUES ('<user-id>', 'LL', 'Yleislääketiede');
```

**Potilas:**
- Email: `matti.meikalainen@example.com`
- Password: (valitse vahva salasana)
- Kopioi käyttäjän `id` (UUID)
- Aja SQL:

```sql
-- Korvaa <user-id> kopioidulla UUID:lla
INSERT INTO public.profiles (id, role, full_name) 
VALUES ('<user-id>', 'patient', 'Matti Meikäläinen');

INSERT INTO public.patients (user_id, date_of_birth, gender, care_path_start_date) 
VALUES ('<user-id>', '1975-05-15', 'male', '2026-06-01');

-- Luo hoitopolku (care path) - korvaa doctor_id lääkärin ID:llä
INSERT INTO public.care_paths (
  patient_id, 
  doctor_id, 
  condition, 
  target_systolic, 
  target_diastolic, 
  target_glucose,
  target_weight
) VALUES (
  (SELECT id FROM public.patients WHERE user_id = '<potilas-user-id>'),
  (SELECT id FROM public.doctors WHERE user_id = '<lääkäri-user-id>'),
  'hypertension',
  135, 85, 6.0, 89.5
);
```

---

## Vaihe 3: Konfiguroi sovellus

### 3.1 Kopioi ympäristömuuttujat

```bash
cd app
cp .env.example .env.local
```

### 3.2 Täytä `.env.local`

Mene Supabase Dashboardiin → **Settings > API**

Kopioi:
- **Project URL** → `VITE_SUPABASE_URL`
- **Project API keys > anon public** → `VITE_SUPABASE_ANON_KEY`

Esimerkki `.env.local`:

```bash
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Tärkeää:** Älä koskaan commitoi `.env.local` -tiedostoa Gitiin!

---

## Vaihe 4: Käynnistä sovellus paikallisesti

```bash
cd app
pnpm dev  # tai: npm run dev
```

Sovellus käynnistyy osoitteessa: [http://localhost:3000](http://localhost:3000)

### Kirjaudu sisään

- Mene `/login`
- Kirjaudu potilaana: `matti.meikalainen@example.com`
- Tai lääkärinä: `anna.lehtinen@example.com`

Jos kirjautuminen onnistuu, näet Dashboard-sivun.

---

## Vaihe 5: Kehitystyö

### Kansiojärjestelmä

```
app/
├── src/
│   ├── components/      # React-komponentit
│   │   ├── patient/     # Potilassovelluksen komponentit
│   │   ├── doctor/      # LääkäriPRO-komponentit
│   │   └── shared/      # Jaetut komponentit (graph, tiles, ...)
│   ├── hooks/           # Custom React hooks (useAuth, useMeasurements, ...)
│   ├── lib/             # Kirjastot (supabase.ts, ...)
│   ├── pages/           # Sivukomponentit (Login, Dashboard, ...)
│   ├── types/           # TypeScript-tyypit (database.ts, ...)
│   ├── utils/           # Aputoiminnot (calculations.ts, formatting.ts, ...)
│   └── styles/          # CSS-tiedostot
├── public/              # Staattiset tiedostot (kuvat, manifest.json)
├── supabase/            # Supabase-migraatiot (vain kehityskäyttöön)
│   └── migrations/
└── docs/                # Dokumentaatio
```

### Suositeltava kehitysjärjestys

**Katso:** [`docs/FUNCTION_ANALYSIS.md`](./FUNCTION_ANALYSIS.md) – Tarkat ohjeet siitä, mitkä funktiot siirtyvät sellaisenaan ja missä järjestyksessä komponentit kannattaa rakentaa.

**Pikaohjeet:**

1. **Aloita ydinlaskennasta** (`src/utils/`)
   - Nämä ovat puhtaita funktioita, helppo testata
   - Kopioi demo-funktiot, kirjoita testit

2. **Rakenna yksinkertaiset komponentit**
   - `<Sparkline />`, `<MetricTile />`, `<BigGraph />`
   - Käytä demo-HTMListä kopioitua CSS:ää

3. **Luo Supabase-hookit**
   - `useMeasurements()`, `useMedications()`, `useSymptoms()`
   - Katso esimerkit: `src/hooks/` -kansiosta

4. **Liitä komponentit ja hookit**
   - Dashboard lataa datan hookilla
   - Komponentti renderöi datan

### Testing

```bash
# Yksikkötestit (utils-funktiot)
pnpm test

# Testit UI-tilassa
pnpm test:ui

# Type-check ilman buildia
pnpm type-check
```

---

## Vaihe 6: AI-proxy (LääkäriPRO)

LääkäriPRO AI-lausuntoapuri vaatii backend-proxyn, koska API-avainta ei saa koskaan paljastaa selaimelle.

### 6.1 Luo Supabase Edge Function

```bash
# Supabase CLI:llä
supabase functions new ai-generate

# Tai manuaalisesti: luo tiedosto
# supabase/functions/ai-generate/index.ts
```

**Sisältö** (esimerkki):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { type, patientData } = await req.json();
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Luo ${type} potilaalle: ${JSON.stringify(patientData)}`
        }
      ]
    })
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 6.2 Deploy funktio

```bash
# Lisää Anthropic API-avain secretina
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy funktio
supabase functions deploy ai-generate
```

### 6.3 Käytä sovelluksessa

```typescript
// src/lib/ai.ts
export async function generateAIStatement(type: string, patientData: any) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
      },
      body: JSON.stringify({ type, patientData })
    }
  );
  return response.json();
}
```

---

## Vaihe 7: PWA-asetukset (Progressive Web App)

Sovellus on valmiiksi konfiguroitu PWA:ksi. Voit asentaa sen puhelimeen:

### iOS (Safari)

1. Avaa sovellus Safarilla
2. Paina "Jaa"-painiketta
3. Valitse "Lisää Koti-valikkoon"

### Android (Chrome)

1. Avaa sovellus Chromella
2. Valitse "⋮" → "Asenna sovellus"

### Offline-toiminnallisuus

Vite PWA Plugin generoi automaattisesti Service Workerin. Muokkaa `vite.config.ts` -tiedostossa `workbox`-asetuksia tarpeen mukaan.

---

## Vaihe 8: Tuotantoon deployaus (Vercel)

### 8.1 Yhdistä GitHub

```bash
# Committaa kaikki muutokset
git add .
git commit -m "Initial React migration"
git push origin main
```

### 8.2 Deploy Verceliin

#### Vaihtoehto A: Vercel Dashboard

1. Mene [vercel.com/new](https://vercel.com/new)
2. Valitse repo: `hoitopolku-ai`
3. **Root Directory:** `app`
4. **Framework Preset:** Vite
5. **Environment Variables:** Lisää samat kuin `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Paina "Deploy"

#### Vaihtoehto B: Vercel CLI

```bash
cd app
vercel

# Seuraa ohjeita:
# - Set up and deploy? Yes
# - Which scope? (valitse tiimisi)
# - Link to existing project? No
# - Project name: hoitopolku
# - Directory: . (nykyinen)

# Lisää ympäristömuuttujat
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy tuotantoon
vercel --prod
```

### 8.3 Konfiguroi Supabase (tuotanto)

Lisää Vercelin domain Supabasen sallittuihin URL:eihin:

1. Mene **Supabase > Authentication > URL Configuration**
2. Lisää **Site URL:** `https://your-app.vercel.app`
3. Lisää **Redirect URLs:**
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**` (kehitystä varten)

---

## Vaihe 9: Monitorointi ja lokitus

### Supabase Logs

- **Database Logs:** `supabase/dashboard` → Logs → Database
- **API Logs:** Logs → API
- **Auth Logs:** Logs → Auth

### Vercel Analytics

Lisää `package.json`:iin:

```json
"dependencies": {
  "@vercel/analytics": "^1.1.1"
}
```

Käytä `App.tsx`:ssä:

```typescript
import { Analytics } from '@vercel/analytics/react';

// ...
<Analytics />
```

---

## Vaihe 10: Turvallisuuden tarkistus (Production Checklist)

Ennen tuotantokäyttöä:

- [ ] **RLS on päällä** kaikissa Supabase-tauluissa
- [ ] **API-avaimet eivät näy** selaimessa (tarkista Dev Tools > Network)
- [ ] **HTTPS käytössä** (Vercel tekee automaattisesti)
- [ ] **CSP-otsikot** lisätty `vercel.json`:iin (jos tarpeen)
- [ ] **Access log** kirjautuu oikein (testaa lääkärin avaamalla potilaan tiedot)
- [ ] **Supabase EU-alueella** (Frankfurt)

### Tarkista RLS-säännöt

```bash
# Kokeile kirjautua potilaana ja yrittää lukea toisen potilaan dataa
# Supabasen pitäisi palauttaa tyhjä taulukko (ei virhettä)
```

---

## Ongelmanratkaisu (Troubleshooting)

### "Invalid API Key" -virhe

- Tarkista että `.env.local` sisältää oikean `VITE_SUPABASE_ANON_KEY`
- Käynnistä dev-server uudelleen (`pnpm dev`)

### "Row Level Security" -virhe

- Varmista että RLS on päällä: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Tarkista että oikeat policyt ovat luotu initial_schema.sql:stä

### Ei dataa ladatessa

- Avaa **Dev Tools > Console** ja etsi virheitä
- Tarkista että `care_paths`-taulu sisältää rivin linkittämässä potilaan ja lääkärin
- Tarkista että `measurements`, `medications` jne. on linkitetty oikeaan `care_path_id`

### CORS-virhe AI-kutsuissa

- Varmista että käytät Edge Functionia, et suoraa Anthropic API -kutsua
- Tarkista että Edge Function on deploystä: `supabase functions list`

### PWA ei asennu

- Varmista että sovellus on HTTPS:ssä (localhost OK kehityksessä)
- Tarkista että `manifest.json` on oikein (`public/manifest.json`)
- Tarkista `vite-plugin-pwa` -asetukset `vite.config.ts`:ssä

---

## Seuraavat askeleet

Kun perusrakenne toimii:

1. **Toteuta komponentit** (katso [`FUNCTION_ANALYSIS.md`](./FUNCTION_ANALYSIS.md))
2. **Lisää testit** (`src/**/*.test.ts`)
3. **Optimoi suorituskyky** (React.memo, lazy loading)
4. **Lisää Suomi.fi -kirjautuminen** (tuotantoon)
5. **MDR-dokumentaatio** (tekninen tiedosto, riskianalyysi)

---

## Liittyvät dokumentit

- [Tekninen siirtymäsuunnitelma](./TECH_MIGRATION_PLAN.md) - Kokonaisarkkitehtuuri
- [Funktioanalyysi](./FUNCTION_ANALYSIS.md) - Mitä siirtyy mistäkin
- [Supabase Schema](../supabase/migrations/) - Tietokantarakenne

---

## Tuki ja yhteisö

**Kysymyksiä?**
- Luo **Issue** GitHubissa
- Supabase-tuki: [supabase.com/docs](https://supabase.com/docs)
- Vercel-tuki: [vercel.com/docs](https://vercel.com/docs)

Onnea sovelluksen rakentamiseen! 🚀
