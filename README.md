# Hoitopolku.ai

Potilaan ja lääkärin välinen hoitoseurantasovellus — verenpaine, verensokeri, paino ja lääkitys yhdessä paikassa.

---

## 📁 Projektirakenteen yleiskatsaus

Tämä repositorio sisältää sekä nykyiset **HTML-demot** että uuden **React/Supabase-tuotantosovelluksen** pohjan.

```
hoitopolku-ai/
├── 📄 index.html                    # Landing page (staattinen)
├── 📄 hoitopolku-demo.html          # Potilassovelluksen demo
├── 📄 laakaripro.html               # Lääkärin työpöydän demo
│
├── 📁 app/                          # 🚀 UUSI: React/Supabase-sovellus
│   ├── src/
│   │   ├── components/              # React-komponentit
│   │   ├── hooks/                   # Custom hooks (useAuth, useMeasurements...)
│   │   ├── lib/                     # Kirjastot (supabase.ts)
│   │   ├── pages/                   # Sivukomponentit
│   │   ├── types/                   # TypeScript-tyypit
│   │   └── utils/                   # Aputoiminnot (calculations, formatting...)
│   ├── package.json
│   └── vite.config.ts
│
├── 📁 supabase/                     # 🚀 UUSI: Tietokannan migraatiot
│   └── migrations/
│       ├── 20260904000000_initial_schema.sql
│       └── 20260904000001_seed_data.sql
│
└── 📁 docs/                         # 📚 Dokumentaatio
    ├── TECH_MIGRATION_PLAN.md       # Tekninen arkkitehtuuri
    ├── FUNCTION_ANALYSIS.md         # Funktioiden migraatioanalyysi
    ├── SETUP.md                     # Projektin pystytysohjeet
    └── MIGRATION_ROADMAP.md         # Viikkokohtainen aikataulu
```

---

## 🎯 Nykytila

### ✅ Toiminnassa

Molemmat sovellukset lukevat ja kirjoittavat **Supabase-tietokantaan** (EU, Tukholma).
Kirjaukset säilyvät, ja lääkäri näkee potilaan tiedot jakokoodilla.

- **Potilassovellus** (`hoitopolku-demo.html`) — mittausten kirjaus, käyrät, oireseuranta,
  hoitopolun aikajana ja jakokoodin luonti
- **LääkäriPRO** (`laakaripro.html`) — lääkärin työpöytä: jakokoodin lunastus, potilaan
  mittaukset, laboratorio, lääkitys, oireet ja lausuntoluonnos
- **Landing page** (`index.html`) — esittelysivu

**Demotunnukset**

| Rooli | Sähköposti | Salasana |
|---|---|---|
| Potilas | `p@demo.fi` | `hoitopolku2026` |
| Lääkäri | `l@demo.fi` | `hoitopolku2026` |

### 🚧 Kesken

- `app/` — React-runko, jonka sivut ovat vielä paikkamerkkejä. Se osoittaa
  tietomalliin jota ei ole olemassa, joten se on joko poistettava tai
  osoitettava nykyiseen skeemaan.
- Kalenterinäkymän tapahtumat ovat yhä kovakoodattuja (`care_events` kattaisi ne).
- Tietokanta ei mallinna lääkkeen ottoaikaa (aamu/ilta).
- AI-lausuntoluonnos koostetaan paikallisesta pohjasta. Oikea kielimalli vaatii
  palvelinpuolen välityksen, jotta API-avain ei päädy selaimeen.

---

## 🚀 Pika-aloitus (Demot)

### Katso demoja paikallisesti

Sovellukset käyttävät ES-moduuleja, joten ne on tarjoiltava palvelimelta —
`file://`-osoitteesta avaaminen ei toimi.

```bash
git clone https://github.com/Nougat3/hoitopolku-ai.git
cd hoitopolku-ai
python3 -m http.server 8000
```

Avaa selaimessa:

- Potilas: <http://localhost:8000/hoitopolku-demo.html>
- Lääkäri: <http://localhost:8000/laakaripro.html>

Kirjaudu yllä olevilla demotunnuksilla. Kokeile koko ketju: kirjaa potilaana
mittaus, luo jakokoodi, ja lunasta se lääkärin työpöydällä.

---

## 🛠️ Kehitys (React-sovellus)

### Esivalmistelut

1. **Supabase-tili** ([supabase.com](https://supabase.com/)) — luo projekti **Frankfurt**-alueelle
2. **Node.js 18+** ([nodejs.org](https://nodejs.org/))
3. **pnpm** (suositeltu): `npm install -g pnpm`

### Asennusohjeet

**Katso täydelliset ohjeet:** [`docs/SETUP.md`](docs/SETUP.md)

**Pikaohjeet:**

```bash
# 1. Asenna riippuvuudet
cd app
pnpm install

# 2. Kopioi ympäristömuuttujat
cp .env.example .env.local
# Täytä VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY

# 3. Aja Supabase-migraatiot
# Mene Supabase Dashboardiin → SQL Editor
# Kopioi ja aja: ../supabase/migrations/20260904000000_initial_schema.sql
# Kopioi ja aja: ../supabase/migrations/20260904000001_seed_data.sql

# 4. Käynnistä sovellus
pnpm dev
# Avautuu: http://localhost:3000
```

### Testaus

```bash
# Yksikkötestit
pnpm test

# Type-check
pnpm type-check

# Lint
pnpm lint
```

---

## 📚 Dokumentaatio

| Dokumentti | Kuvaus |
|-----------|--------|
| [**SETUP.md**](docs/SETUP.md) | Yksityiskohtaiset asennusohjeet (Supabase, Vercel, ympäristömuuttujat) |
| [**TECH_MIGRATION_PLAN.md**](docs/TECH_MIGRATION_PLAN.md) | Arkkitehtuurikuvaus: miksi React/Supabase, mitä muuttuu |
| [**FUNCTION_ANALYSIS.md**](docs/FUNCTION_ANALYSIS.md) | Tarkat listat: mitkä funktiot siirtyvät sellaisenaan, mitkä uudelleenkirjoitetaan |
| [**MIGRATION_ROADMAP.md**](docs/MIGRATION_ROADMAP.md) | Viikkokohtainen aikataulu (9–13 viikkoa) |

---

## 🏗️ Arkkitehtuuri

```
┌──────────────────┐                              ┌──────────────────┐
│  hoitopolku-     │                              │  laakaripro.     │
│  demo.html       │                              │  html            │
│  (potilas)       │                              │  (lääkäri)       │
└────────┬─────────┘                              └────────┬─────────┘
         │                js/api.js                        │
         │            js/supabase.js                       │
         └──────────────────┬─────────────────────────────-┘
                            ▼
                 ┌────────────────────────┐
                 │  Supabase (eu-north-1) │
                 │  Postgres + Auth + RLS │
                 └────────────────────────┘
```

Sovellukset ovat staattisia tiedostoja ilman käännösvaihetta. `js/supabase.js`
puhuu suoraan PostgREST- ja GoTrue-rajapinnoille `fetch`illä, joten sivujen CSP
voi pysyä tiukkana (`script-src 'self'`).

**Pääsy potilaan tietoihin:** lääkäri ei näe mitään ennen kuin potilas on luonut
jakokoodin ja lääkäri lunastanut sen. Lunastus luo `care_sessions`-rivin, joka
vanhenee koodin mukana. Koodi tallennetaan vain SHA-256-tiivisteenä.

---

## 🔒 Tietoturva ja GDPR

- ✅ **EU-data** — Supabase Frankfurt-alue
- ✅ **Rivitason suojaus (RLS)** — potilas näkee vain omat tietonsa
- ✅ **Access log** — potilas näkee kuka on avannut hänen tietonsa
- ✅ **AI-proxy** — API-avain ei koskaan paljasteta selaimelle

**MDR-luokka:** I (itse-ilmoitus) — ei diagnostisia päätöksiä, vain seurantatyökalu.

---

## 🤝 Osallistuminen

Tämä projekti on vielä kehitysvaiheessa. Jos haluat osallistua:

1. **Fork** repo
2. Luo uusi branch (`git checkout -b feature/amazing-feature`)
3. Commitoi muutokset (`git commit -m 'feat: lisää amazing-feature'`)
4. Pushaa branch (`git push origin feature/amazing-feature`)
5. Avaa **Pull Request**

---

## 📝 Lisenssi

Tämä projekti on private-repositorio. Lisenssi määritellään myöhemmin.

---

## 📧 Yhteystiedot

**Projekti:** Hoitopolku.ai  
**GitHub:** [Nougat3/hoitopolku-ai](https://github.com/Nougat3/hoitopolku-ai)

---

## 🗺️ Roadmap

- [x] **Q3 2026:** HTML-demot valmiit
- [x] **Syyskuu 2026:** Migraatiorakenne luotu
- [ ] **Q4 2026:** React-sovellus valmis (Vaihe 1–4)
- [ ] **Q1 2027:** Tuotantokäyttö pilot-käyttäjillä
- [ ] **Q2 2027:** Suomi.fi-kirjautuminen, laajennetut ominaisuudet

**Seuraa edistymistä:** [GitHub Projects](../../projects) (tulossa)

---

Rakennettu ❤️:llä Suomessa 🇫🇮
