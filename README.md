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

### ✅ Valmiina (HTML-demot)

- **Potilassovellus** (`hoitopolku-demo.html`) — toimiva demo mittausten kirjaamisesta, käyrän piirtämisestä ja oireiden seurannasta
- **LääkäriPRO** (`laakaripro.html`) — lääkärin työpöytä AI-lausuntoapurilla
- **Landing page** (`index.html`) — esittelysivu

🔗 **Livenä:** [nougat3.github.io/hoitopolku-ai](https://nougat3.github.io/hoitopolku-ai/)

### 🚧 Työn alla (React/Supabase-migraatio)

**Vaihe 0: Perusrakenne** ✅ VALMIS
- [x] Tietokannan SQL-skriptit (`supabase/migrations/`)
- [x] React-projektipohja (`app/`)
- [x] Ydinlaskentafunktiot (`src/utils/`)
- [x] Dokumentaatio

**Vaihe 1–4: Toteutus** 🚧 ALOITTAMATTA
- [ ] Potilassovelluksen datakerros
- [ ] LääkäriPRO-datakerros
- [ ] Reaaliaikainen synkronointi
- [ ] PWA + tuotantovalmius

📖 **Katso:** [`docs/MIGRATION_ROADMAP.md`](docs/MIGRATION_ROADMAP.md) — yksityiskohtainen 12 viikon aikataulu

---

## 🚀 Pika-aloitus (Demot)

### Katso demoja paikallisesti

```bash
# Kloonaa repo
git clone https://github.com/Nougat3/hoitopolku-ai.git
cd hoitopolku-ai

# Avaa selaimessa
# macOS:
open index.html

# Linux:
xdg-open index.html

# Windows:
start index.html
```

Tai käytä paikallista palvelinta:

```bash
python -m http.server 8000
# Avaa http://localhost:8000
```

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

### Nykyinen (Demot)

```
┌─────────────────┐        ┌─────────────────┐
│  hoitopolku-    │        │  laakaripro.    │
│  demo.html      │        │  html           │
│  (potilas)      │        │  (lääkäri)      │
└─────────────────┘        └─────────────────┘
       ↓                           ↓
  [Kovakoodattu data]       [Kovakoodattu data]
       ↓                           ↓
  [Ei kommunikoi keskenään]
```

**Ongelma:** Lääkäri ei voi muuttaa potilaan lääkitystä, koska kyseessä on kaksi erillistä HTML-tiedostoa.

### Tuleva (React + Supabase)

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   Hoitopolku     │◄──────►│                   │◄──────►│   LääkäriPRO     │
│   (potilas, PWA) │        │  Supabase (EU)    │        │   (lääkäri, PWA)  │
└─────────────────┘        │  Postgres + Auth  │        └─────────────────┘
                            │  + Realtime       │
                            └──────────────────┘
```

**Ratkaisu:** Yksi yhteinen tietokanta, reaaliaikainen synkronointi, rivitason suojaus (RLS).

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
