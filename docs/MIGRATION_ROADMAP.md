# Migration Roadmap
## HTML-demoista tuotantosovellukseksi - yksityiskohtainen aikataulu

Tämä dokumentti täydentää [teknistä siirtymäsuunnitelmaa](./TECH_MIGRATION_PLAN.md) konkreettisella viikkokohtaisella roadmapilla.

---

## Yleiskatsaus

| Vaihe | Kesto | Päätehtävät | Lopputulos |
|-------|-------|-------------|------------|
| **Vaihe 0** | 1–2 vk | Tietomallin viimeistely, Supabase-setup | ✅ Toimiva dev-tietokanta, testikäyttäjät |
| **Vaihe 1** | 3–4 vk | Potilassovelluksen datakerros | ✅ Potilas voi kirjata mittauksia ja ne tallentuvat Supabaseen |
| **Vaihe 2** | 2–3 vk | LääkäriPRO-datakerros | ✅ Lääkäri näkee potilaan tiedot, AI-proxy toimii |
| **Vaihe 3** | 1–2 vk | Reaaliaikainen synkronointi | ✅ Lääkärin muutos näkyy potilaalla sekunneissa |
| **Vaihe 4** | 2 vk | PWA + MDR-dokumentaatio | ✅ Asennettava sovellus, tuotantovalmis |

**Yhteensä: 9–13 viikkoa** (1 kokopäiväinen kehittäjä tai vastaava osa-aikaisena)

> **Tila 2026-09:** Vaiheet 0–4 on toteutettu React-sovelluksessa live-skeemaa vasten
> (`app/`). AI Edge Function deployataan tarvittaessa; ilman secretia toimii localDraft.

---

## Vaihe 0: Perusta (1–2 viikkoa)

### Viikko 1: Supabase-projektin pystytys

**Tavoite:** Toimiva tietokanta EU-alueella, kaikki taulut ja RLS-säännöt paikoillaan.

#### Päivä 1–2: Projektin luonti ja migraatiot

- [x] Luo Supabase-projekti Frankfurt-alueelle
- [x] Aja `20260904000000_initial_schema.sql`
- [x] Tarkista että RLS on päällä kaikissa tauluissa
- [x] Aja `20260904000001_seed_data.sql` (testidatan luonti)

#### Päivä 3–4: Testikäyttäjien luonti

- [ ] Luo lääkäri-käyttäjä Supabase Authissa
- [ ] Luo potilas-käyttäjä
- [ ] Linkitä käyttäjät `profiles`, `doctors`, `patients` -tauluihin
- [ ] Luo yksi `care_paths` -rivi yhdistämään lääkäri ja potilas
- [ ] Testaa RLS: kirjaudu potilaana, yritä lukea toisen potilaan dataa → pitäisi palauttaa tyhjä

#### Päivä 5: React-projektin pystytys

- [x] Luo `app/` -kansio, aja `pnpm install`
- [x] Kopioi `.env.example` → `.env.local`, täytä Supabase-avaimet
- [x] Käynnistä `pnpm dev`, varmista että sovellus käynnistyy

### Viikko 2: Ydinlaskentafunktiot ja testit

**Tavoite:** Kaikki puhtaat funktiot siirretty ja testattu.

#### Päivä 1–2: Kopioi utils-funktiot

- [x] `src/utils/calculations.ts` — rolling, project, tileState
- [x] `src/utils/formatting.ts` — fmt, clock, fmtDate
- [x] `src/utils/dateUtils.ts` — dateForDay, sameDay
- [x] `src/utils/graphUtils.ts` — smooth

#### Päivä 3–5: Kirjoita testit

- [ ] `calculations.test.ts` — testaa että rolling(BP) antaa samat tulokset kuin demossa
- [ ] `formatting.test.ts` — testaa suomalainen muotoilu (pilkku, päivämäärä)
- [ ] `graphUtils.test.ts` — testaa smooth-path algoritmi

**Lopputulos:** `pnpm test` → kaikki testit vihreitä ✅

---

## Vaihe 1: Potilassovelluksen datakerros (3–4 viikkoa)

### Viikko 3: Kirjautuminen ja autentikointi

**Tavoite:** Potilas voi kirjautua ja sovellus tietää kuka hän on.

#### Päivä 1–2: Login-sivu

- [ ] Luo `src/pages/LoginPage.tsx`
- [ ] Lomake: sähköposti + salasana
- [ ] Kutsu `supabase.auth.signInWithPassword()`
- [ ] Ohjaa onnistumisen jälkeen `/patient`

#### Päivä 3–4: Auth-tila (Zustand store)

- [x] `src/hooks/useAuthStore.ts` — user, profile, loading
- [ ] `src/App.tsx` — kuuntele `onAuthStateChange`
- [ ] Lataa käyttäjän profiili kirjautumisen jälkeen

#### Päivä 5: Protected routes

- [x] `src/App.tsx` — jos ei kirjautunut, ohjaa `/login`
- [ ] Testaa: avaa `/patient` ilman kirjautumista → ohjaa loginiin

**Lopputulos:** Potilas voi kirjautua ja nähdä tyhjän dashboardin ✅

### Viikko 4: Mittausten lukeminen

**Tavoite:** Potilas näkee aiemmat mittauksensa (demossa kovakoodatut).

#### Päivä 1–2: Supabase-hook mittauksille

- [ ] `src/hooks/useMeasurements.ts`
- [ ] Hae `SELECT * FROM measurements WHERE care_path_id = $1`
- [ ] Palauta `{ bloodPressure, glucose, weight, loading, error }`

#### Päivä 3–4: MetricTiles-komponentti

- [ ] `src/components/shared/MetricTile.tsx` — näyttää yhden laatan
- [ ] `src/components/patient/MetricTiles.tsx` — renderöi kaikki laatat
- [ ] Käytä `spark()` sparklinen luontiin (kopioi demosta)

#### Päivä 5: Dashboard-sivu

- [ ] `src/pages/patient/Dashboard.tsx`
- [ ] Lataa mittaukset hookilla
- [ ] Renderöi `<MetricTiles data={bloodPressure} />`

**Lopputulos:** Potilas näkee laatat käyristä, arvot tulevat Supabasesta ✅

### Viikko 5: Mittausten kirjaaminen

**Tavoite:** Potilas voi lisätä uuden mittauksen → tallentuu Supabaseen.

#### Päivä 1–2: Modal-komponentti

- [ ] `src/components/shared/Modal.tsx` — geneerinen modal
- [ ] `src/components/patient/MeasurementModal.tsx` — lomake mittaukselle

#### Päivä 3–4: Lomakkeen validointi

- [ ] Verenpaine: systo 70–260, diasto 40–160, systo > diasto
- [ ] Verensokeri: 1.5–35 mmol/l
- [ ] Paino: 30–300 kg
- [ ] Näytä virheviesti punaisella (sama logiikka kuin demossa)

#### Päivä 5: INSERT-kutsu

- [ ] `supabase.from('measurements').insert({ ... })`
- [ ] Päivitä hook automaattisesti (Supabase Realtime tai manuaalinen refetch)
- [ ] Näytä toast-notifikaatio "Tallennettu"

**Lopputulos:** Potilas kirjaa mittauksen → se ilmestyy laattoihin ja tietokantaan ✅

### Viikko 6: Käyrä-näkymä (BigGraph)

**Tavoite:** Potilas näkee detaljoidun käyrän yhdestä metriikasta.

#### Päivä 1–3: BigGraph-komponentti

- [ ] `src/components/shared/BigGraph.tsx`
- [ ] Kopioi `drawGraph()` -logiikka demosta
- [ ] Käytä `smoothPath()` ja `rolling()` funktioita
- [ ] Renderöi SVG:nä

#### Päivä 4–5: Tooltip ja segmentit

- [ ] Tooltip näyttää arvon hoveroitaessa
- [ ] Segmentit: 14 vrk / 6 vk / Koko jakso
- [ ] Projektio: tavoitteen saavutusarvio

**Lopputulos:** Potilas klikkaa "Verenpaine" → näkee ison käyrän ja trendin ✅

---

## Vaihe 2: LääkäriPRO-datakerros (2–3 viikkoa)

### Viikko 7: Lääkärin kirjautuminen ja potilaslista

**Tavoite:** Lääkäri kirjautuu ja näkee listan potilaistaan.

#### Päivä 1–2: Lääkärin dashboard

- [ ] `src/pages/doctor/Dashboard.tsx`
- [ ] Hae `SELECT * FROM care_paths WHERE doctor_id = (SELECT id FROM doctors WHERE user_id = auth.uid())`

#### Päivä 3–5: Potilaslista ja avaaminen

- [ ] `src/components/doctor/PatientList.tsx` — lista korteista
- [ ] Klikkaamalla potilasta → `openPatient(id)`
- [ ] Kirjaa `INSERT INTO access_log` automaattisesti

**Lopputulos:** Lääkäri näkee potilaansa ja voi avata heidän tietonsa ✅

### Viikko 8: Potilaan tietojen näyttäminen

**Tavoite:** Lääkäri näkee saman näkymän kuin potilas, mutta read-only.

#### Päivä 1–3: PatientView-komponentti

- [ ] `src/components/doctor/PatientView.tsx`
- [ ] Uudelleenkäytä `<BigGraph />`, `<MetricTiles />` jne.
- [ ] Hae potilaan data `care_path_id`:n perusteella

#### Päivä 4–5: Lääkityksen muokkaus

- [ ] `src/components/doctor/MedicationEditor.tsx`
- [ ] Muokkaa `dosage`-kenttää
- [ ] `UPDATE medications SET dosage = $1 WHERE id = $2`
- [ ] Kirjaa `INSERT INTO medication_changes`

**Lopputulos:** Lääkäri voi nostaa annosta, muutos tallentuu tietokantaan ✅

### Viikko 9: AI-lausuntoapuri

**Tavoite:** LääkäriPRO:n AI-nappi toimii.

#### Päivä 1–2: Supabase Edge Function

- [ ] Luo `supabase/functions/ai-generate/index.ts`
- [ ] Lisää Anthropic API -kutsu
- [ ] Deploy: `supabase functions deploy ai-generate`

#### Päivä 3–4: Client-puolen kutsu

- [ ] `src/lib/ai.ts` — `generateAIStatement(type, patientData)`
- [ ] Hae Edge Functionista: `POST /functions/v1/ai-generate`

#### Päivä 5: Fallback ilman AI:ta

- [ ] Kopioi `localDraft()` demosta
- [ ] Jos AI-kutsu epäonnistuu → näytä paikallinen luonnos

**Lopputulos:** Lääkäri painaa "Luo hoitosuunnitelma" → AI generoi tekstin ✅

---

## Vaihe 3: Reaaliaikainen synkronointi (1–2 viikkoa)

### Viikko 10: Supabase Realtime

**Tavoite:** Lääkärin tekemä muutos näkyy potilaan sovelluksessa ilman että potilas päivittää sivua.

#### Päivä 1–2: Realtime-tilaus mittauksille

- [ ] `src/hooks/useMeasurements.ts` — lisää `.on('postgres_changes', ...)` -kuuntelija
- [ ] Testaa: lääkäri lisää mittauksen → potilas näkee sen välittömästi

#### Päivä 3–4: Realtime-tilaus lääkkeille

- [ ] `src/hooks/useMedications.ts` — sama logiikka
- [ ] Testaa: lääkäri nostaa annosta → potilas näkee uuden annoksen sekunneissa

#### Päivä 5: Access log

- [ ] Potilas näkee `<AccessLog />` -komponentin
- [ ] Lista: "Anna Lehtinen avasi tietosi 12.10.2026 klo 14.30"
- [ ] Hae `SELECT * FROM access_log WHERE patient_id = ...`

**Lopputulos:** Kaksisuuntainen reaaliaikainen päivitys toimii ✅

---

## Vaihe 4: PWA + Tuotantovalmius (2 viikkoa)

### Viikko 11: PWA-ominaisuudet

**Tavoite:** Sovellus on asennettavissa puhelimeen.

#### Päivä 1–2: Manifest ja ikonit

- [x] `public/manifest.json` — nimi, ikonit, teemaväri
- [ ] Kopioi ikonit demosta (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`)

#### Päivä 3–4: Service Worker

- [x] `vite-plugin-pwa` on jo konfiguroitu `vite.config.ts`:ssä
- [ ] Testaa offline-toiminta: sammuta netti → sovellus latautuu cachetusta

#### Päivä 5: Testaa asennus

- [ ] iOS Safari → "Lisää Koti-valikkoon"
- [ ] Android Chrome → "Asenna sovellus"

**Lopputulos:** Sovellus toimii offline ja on asennettavissa ✅

### Viikko 12: Tuotantoon deployaus ja dokumentaatio

**Tavoite:** Sovellus on livenä Vercelissä, MDR-dokumentaatio ajan tasalla.

#### Päivä 1–2: Vercel-deploy

- [ ] Yhdistä GitHub Verceliin
- [ ] Lisää ympäristömuuttujat (Supabase URL + anon key)
- [ ] Deploy → testaa tuotanto-URL

#### Päivä 3–4: MDR-dokumentaatio

- [ ] Päivitä tekninen tiedosto: nyt React + Supabase, ei enää HTML-demo
- [ ] Riskianalyysi: AI-proxy, access_log, EU-data
- [ ] Käyttöohjeet: potilaan ja lääkärin näkymät

#### Päivä 5: Lopputestaus

- [ ] **E2E-testit:** Kirjaudu, kirjaa mittaus, avaa potilaan tiedot lääkärinä
- [ ] **Turvallisuustesti:** Yritä lukea toisen potilaan dataa → pitäisi estyä
- [ ] **Realtime-testi:** Lääkäri muuttaa → potilas näkee

**Lopputulos:** Sovellus on tuotantovalmis ja dokumentoitu ✅

---

## Post-launch (jatkokehitys)

Kun perusversio on livenä:

### Kuukausi 1–2: Stabilointi ja käyttäjäpalaute

- [ ] Kerää palautetta ensimmäisiltä käyttäjiltä (lääkärit + potilaat)
- [ ] Korjaa bugit ja käytettävyysongel mat
- [ ] Lisää puuttuvat toiminnot (esim. PDF-raporttien lataus)

### Kuukausi 3–4: Laajennetut ominaisuudet

- [ ] Suomi.fi -kirjautuminen (potilaille)
- [ ] Viestintäominaisuus (chat lääkärin ja potilaan välillä)
- [ ] Muistutukset (push-notifikaatiot lääkkeiden otosta)

### Kuukausi 5–6: Skaalautuvuus ja analytiikka

- [ ] Tietokantaindeksien optimointi (jos käyttäjiä > 1000)
- [ ] Aggregoitu analytiikka lääkäreille (kaikki potilaat yhdellä silmäyksellä)
- [ ] A/B-testit eri hoitopolkujen tehokkuudesta

---

## Resurssit ja riippuvuudet

### Kriittiset riippuvuudet

- **Supabase EU-alue:** Pakollinen GDPR:n vuoksi
- **Anthropic API -avain:** Tarvitaan LääkäriPRO:n AI-apurille
- **Vercel Pro -tili:** Jos tarvitaan > 100 GB bandwidth/kk (mahdollisesti vasta kuukausien kuluttua)

### Resurssien jako

**1 kokopäiväinen kehittäjä:**
- Vaihe 0–2 = 6–9 viikkoa (full-stack, backend + frontend)
- Vaihe 3–4 = 3–4 viikkoa (PWA + tuotantoonvienti)

**2 kehittäjää (jaettu työ):**
- Kehittäjä A: Potilassovellus (Vaihe 1)
- Kehittäjä B: LääkäriPRO (Vaihe 2)
- Yhdessä: Realtime + PWA (Vaihe 3–4)
- **Yhteensä: 5–7 viikkoa**

---

## Riskienhallinta

| Riski | Todennäköisyys | Vaikutus | Lieventävä toimenpide |
|-------|----------------|----------|----------------------|
| RLS-säännöt eivät toimi oikein | Keskitaso | Korkea (tietoturva) | Testaa RLS jokaisen taulun kohdalla viikolla 1 |
| AI-kutsu paljastaa API-avaimen | Matala | Korkea (tietoturva) | Käytä Edge Functionia, älä koskaan suoraa kutsua selaimesta |
| Realtime ei toimi kaikissa selaimissa | Matala | Keskitaso | Testaa Safari, Chrome, Firefox ennen tuotantoa |
| Supabase-quota ylittyy | Matala (free tier: 500 MB data) | Keskitaso | Monitoroi tietokantakokoa, siirrä Pro-tilaukseen tarpeen mukaan |
| Projekti kestää pidempään kuin arvioitu | Keskitaso | Matala | Priorisoi: Vaihe 1–2 ensin (MVP), PWA voi tulla myöhemmin |

---

## Valmis!

Tämä roadmap on nyt valmis käytettäväksi. Sovitaan viikkopalaveri (esim. maanantaisin) edistymisen seuraamiseen:

- **Viikkoraportti:** Mitä tehtiin, mitä opittiin, mikä meni suunnitellusti / ei
- **Demo:** Näytä toimiva ominaisuus (esim. viikko 4: "Tässä on nyt MetricTiles joka lataa dataa Supabasesta")
- **Seuraavan viikon tavoitteet:** Mitkä 3–5 tehtävää ovat prioriteetteja

---

## Liittyvät dokumentit

- [Setup-ohje](./SETUP.md) - Miten aloittaa kehitys
- [Funktioanalyysi](./FUNCTION_ANALYSIS.md) - Mitä funktioita siirtyy
- [Tekninen suunnitelma](./TECH_MIGRATION_PLAN.md) - Kokonaisarkkitehtuuri
