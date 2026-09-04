# Hoitopolku.ai

Potilaan ja lääkärin välinen hoitoseurantasovellus — verenpaine, verensokeri, paino
ja lääkitys yhdessä paikassa. Potilas kirjaa, lääkäri näkee vasta kun potilas jakaa
koodin.

---

## Projektin rakenne

```
hoitopolku-ai/
├── index.html                 # Esittelysivu
├── hoitopolku-demo.html       # Potilassovellus
├── laakaripro.html            # Lääkärin työpöytä
├── js/
│   ├── config.js              # Supabasen julkiset asetukset
│   ├── supabase.js            # Kevyt asiakas PostgREST- ja GoTrue-rajapinnoille
│   └── api.js                 # Hoitopolun tietomalli: haku, tallennus, jakokoodit
├── supabase/
│   ├── README.md              # Skeema, roolit, jakokoodifunktiot, migraatioerot
│   └── migrations/            # SQL-migraatiot
└── docs/                      # Suunnitteludokumentit
```

Sovellukset ovat staattisia tiedostoja ilman käännösvaihetta. `js/supabase.js`
puhuu suoraan PostgREST- ja GoTrue-rajapinnoille `fetch`illä, joten sivujen CSP voi
pysyä tiukkana (`script-src 'self'`) — mitään ei ladata CDN:stä.

---

## Nykytila

Molemmat sovellukset lukevat ja kirjoittavat Supabase-tietokantaan (`eu-north-1`,
Tukholma). Kirjaukset säilyvät, ja lääkäri näkee potilaan tiedot jakokoodilla.

**Potilassovellus** — verenpaineen, verensokerin, painon ja laboratorioarvojen
kirjaus, käyrät ja ennusteet, oireseuranta, lääkelista ottoaikoineen, hoitopolun
aikajana, kalenteri ja jakokoodin luonti.

**LääkäriPRO** — jakokoodin lunastus, potilaan mittaukset ja käyrät, laboratorio,
turvakokeet, lääkitys, oireet ja lausuntoluonnos.

### Demotunnukset

| Rooli | Sähköposti | Salasana |
|---|---|---|
| Potilas | `p@demo.fi` | `hoitopolku2026` |
| Lääkäri | `l@demo.fi` | `hoitopolku2026` |

### Mitä ei ole tehty

- **Lausuntoluonnos koostetaan paikallisesta pohjasta**, ei kielimallista. Oikea
  malli vaatisi palvelinpuolen välityksen, jottei API-avain päädy selaimeen.
- **Lääkemuistutusten kytkin on vain käyttöliittymässä** — mitään ilmoitusta ei
  lähetetä eikä tilaa tallenneta.
- **React-runko poistettiin** (`app/`). Se oli pelkkiä paikkamerkkisivuja ja
  osoitti `profiles`-tauluun, jollaista ei ole koskaan ollut olemassa, joten se ei
  olisi kääntynyt tuotantoskeemaa vasten. Tiedostot löytyvät git-historiasta, ja
  suunnitelmat ovat yhä `docs/`-kansiossa. Jos migraatio aloitetaan uudelleen, se
  kannattaa aloittaa nykyisestä skeemasta (`supabase/README.md`).

---

## Pika-aloitus

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

Kirjaudu yllä olevilla demotunnuksilla ja kokeile koko ketju: kirjaa potilaana
mittaus, luo jakokoodi, ja lunasta se lääkärin työpöydällä.

Toista Supabase-projektia vastaan ajettaessa riittää päivittää `js/config.js` ja
`vercel.json`-tiedoston `connect-src`.

---

## Arkkitehtuuri

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

**Pääsy potilaan tietoihin:** lääkäri ei näe mitään ennen kuin potilas on luonut
jakokoodin ja lääkäri lunastanut sen. Lunastus luo `care_sessions`-rivin, joka
vanhenee koodin mukana. Koodi tallennetaan vain SHA-256-tiivisteenä.

Tietokannan taulut, roolit ja jakokoodifunktiot on kuvattu tiedostossa
[`supabase/README.md`](supabase/README.md). Sama tiedosto kertoo, miltä osin
repositorion migraatiot ovat ajautuneet erilleen tuotannosta.

---

## Dokumentaatio

| Dokumentti | Kuvaus |
|-----------|--------|
| [`supabase/README.md`](supabase/README.md) | Skeema, roolit, jakokoodit, migraatioerot |
| [`docs/SETUP.md`](docs/SETUP.md) | Asennusohjeet (Supabase, Vercel, ympäristömuuttujat) |
| [`docs/TECH_MIGRATION_PLAN.md`](docs/TECH_MIGRATION_PLAN.md) | Suunnitelma React-migraatiosta |
| [`docs/FUNCTION_ANALYSIS.md`](docs/FUNCTION_ANALYSIS.md) | Funktioiden migraatioanalyysi |
| [`docs/MIGRATION_ROADMAP.md`](docs/MIGRATION_ROADMAP.md) | Migraation vaiheistus |

`docs/`-kansion migraatiosuunnitelmat on kirjoitettu ennen kuin skeema vakiintui,
joten niiden taulunimet eivät vastaa nykyistä tietokantaa.

---

## Tietoturva ja GDPR

- **EU-data** — Supabase `eu-north-1` (Tukholma)
- **Rivitason suojaus (RLS)** — potilas näkee vain omat tietonsa, lääkäri vain ne
  potilaat joilla on voimassa oleva hoitoistunto
- **Audit-loki** — `audit_log` kerää kirjoitukset triggereillä
- **Julkaistava avain selaimessa** — `js/config.js` sisältää vain `publishable`-avaimen,
  joka ei itsessään anna pääsyä mihinkään: kaikki luku ja kirjoitus kulkee RLS:n läpi

**MDR-luokka:** I (itse-ilmoitus) — ei diagnostisia päätöksiä, vain seurantatyökalu.

---

## Lisenssi ja yhteystiedot

Private-repositorio, lisenssi määritellään myöhemmin.

**GitHub:** [Nougat3/hoitopolku-ai](https://github.com/Nougat3/hoitopolku-ai)
