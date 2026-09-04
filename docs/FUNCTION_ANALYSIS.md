# Funktioanalyysi — Hoitopolku & LääkäriPRO
## Migraatio HTML-demoista React/Supabase-sovellukseen

Tämä dokumentti kuvaa tarkalleen, mitkä funktiot nykyisistä demoista (`hoitopolku-demo.html`, `laakaripro.html`) siirtyvät sellaisenaan uuteen React-sovellukseen, ja mitkä vaativat uudelleenkirjoitusta tai korvaamista.

---

## Luokittelu

Funktiot on luokiteltu viiteen kategoriaan:

| Symboli | Merkitys |
|---------|----------|
| ✅ | **Siirtyy sellaisenaan** — Puhdas funktio, ei sidoksia DOM:iin tai globaaliin tilaan |
| 🔄 | **Siirtyy pienin muutoksin** — Toimintalogiikka säilyy, mutta datakerros muuttuu |
| ⚠️ | **Vaatii refaktorointia** — DOM-manipulaatio korvataan React-komponenteilla |
| 🔧 | **Korvautuu Supabase-kutsulla** — Data tulee tietokannasta, ei globaaleista muuttujista |
| 🚫 | **Poistetaan** — Testi- tai demo-spesifinen logiikka |

---

## 1. HOITOPOLKU (Potilassovellus)

### 1.1 Matemaattiset ja laskentafunktiot

#### ✅ Siirtyvät sellaisenaan

Nämä ovat **puhtaita funktioita** — ottavat sisään datan, palauttavat tuloksen. Eivät muokkaa globaalia tilaa.

| Funktio | Kuvaus | Sijainti uudessa koodissa |
|---------|--------|--------------------------|
| `rolling(pts)` | Laskee 7 vrk liukuvan keskiarvon mittauspisteistä | `src/utils/calculations.ts` |
| `series(m)` | Palauttaa metriikan datasarjan (raaka tai liukuva) | `src/utils/calculations.ts` |
| `smooth(P)` | Luo tasaisen Catmull-Rom-spline-polun pisteistä | `src/utils/graphUtils.ts` |
| `project(r, n)` | Laskee lineaarisen regression ja ennustaa trendin | `src/utils/calculations.ts` |
| `fmt(v, d)` | Muotoilee numeron (desimaalit, pilkku) | `src/utils/formatting.ts` |
| `num(id)` | Parsii syötekentän arvon numeroksi | `src/utils/parsing.ts` |
| `clock()` | Palauttaa ajan muodossa "HH.mm" | `src/utils/formatting.ts` |
| `dateForDay(d)` | Muuttaa päivä-indeksin Date-objektiksi | `src/utils/dateUtils.ts` |
| `sameDay(a, b)` | Vertaa kahta päivämäärää | `src/utils/dateUtils.ts` |
| `fmtDate(d)` | Muotoilee päivämäärän "dd.mm.yyyy" | `src/utils/formatting.ts` |
| `bpSeriesProgress()` | Laskee montako päivää 7:stä on mitattu | `src/utils/carePathUtils.ts` |
| `tileState(m, last, first)` | Päättelee tila-arvon (ok/mid/off) | `src/utils/calculations.ts` |

**Yhteensä: 12 funktiota siirtyy suoraan**

#### 🔄 Siirtyvät pienin muutoksin

Laskentalogiikka säilyy, mutta datalähde muuttuu:

| Funktio | Muutos | Uusi toteutus |
|---------|--------|---------------|
| `gen(baseFn, noise, skipGap)` | Nyt vain testidatan generointiin | `src/utils/testData.ts` (vain dev-tilassa) |
| `labRow(L)` | Renderöi lab-visualisaation HTML:nä → React JSX | `src/components/LabResultRow.tsx` |

### 1.2 Visualisointifunktiot

#### ✅ Siirtyvät sellaisenaan (piirtologiikka)

| Funktio | Kuvaus | Uusi sijainti |
|---------|--------|--------------|
| `spark(vals, color, target, w, h)` | Luo SVG-sparkline-kuvaajan | `src/components/Sparkline.tsx` (React-komponenttina) |

#### 🔄 Siirtyvät pienin muutoksin

| Funktio | Muutos | Uusi toteutus |
|---------|--------|---------------|
| `drawGraph()` | SVG-piirto säilyy, data Supabasesta | `src/components/BigGraph.tsx` |
| `updateSummary(m, line, proj, projEnd)` | Laskenta säilyy, DOM-päivitys → React state | `src/components/GraphSummary.tsx` |
| `showTip(cx, cy)` / `hideTip()` | Tooltip-logiikka → React hover state | `src/components/GraphTooltip.tsx` |

### 1.3 Render-funktiot (UI)

#### ⚠️ Vaativat refaktorointia

Nämä muokkaavat DOM:ia suoraan `.innerHTML`-asetusten kautta. React-sovelluksessa ne korvataan komponenteilla.

| Funktio | React-komponentti | Data Supabasesta |
|---------|-------------------|------------------|
| `buildTiles(box)` | `<MetricTiles />` | `SELECT * FROM measurements WHERE...` |
| `renderTiles()` | `<MetricTiles />` | ✅ |
| `renderLabs()` | `<LabResults />` | `SELECT * FROM lab_results WHERE...` |
| `renderMeds()` | `<MedicationList />` | `SELECT * FROM medications WHERE...` |
| `renderSyms()` | `<SymptomGrid />` | `SELECT * FROM symptoms WHERE...` |
| `renderLog()` | `<ActivityLog />` | Paikallinen state (ei tietokantaa) |
| `renderCalendar()` | `<Calendar />` | `SELECT * FROM events WHERE...` |
| `renderEvents()` | `<EventList />` | `SELECT * FROM events WHERE...` |
| `renderPath()` | `<CarePath />` | `SELECT * FROM events WHERE...` |
| `renderTasks()` | `<DailyTasks />` | Laskettu client-puolella |
| `renderNext()` | `<NextAction />` | Laskettu client-puolella |
| `renderReminders()` | `<MedicationReminders />` | `SELECT * FROM medications WHERE...` |

**Yhteensä: 12 render-funktiota → 12 React-komponenttia**

### 1.4 UI-interaktion käsittely

#### ⚠️ Vaativat refaktorointia

| Funktio | React-toteutus | Huomiot |
|---------|----------------|---------|
| `go(v)` | `useNavigate()` (React Router) | Navigaatio sivujen välillä |
| `openSheet()` / `closeSheet()` | `<Modal open={isOpen}>` | React state |
| `openEntry(e)` / `closeEnt()` | `<MeasurementModal />` | React state |
| `openSym()` / `openAddSym()` | `<SymptomModal />` | React state |
| `openAddMed()` | `<AddMedicationModal />` | React state |
| `selMetric(i)` | `setSelectedMetric(i)` | React state |
| `showDash()` / `showDetail()` | `<Tabs>` tai routing | React state |
| `calShift(n)` | `setMonth(prev => ...)` | React state |
| `taskClick(i)` / `nextAction()` | Click handler | React event |
| `toggleMed(period)` | `setMedsTaken(...)` | React state |
| `onScroll()` | `useEffect` + scroll listener | React hook |
| `toast(t)` | `react-hot-toast` kirjasto | Kolmannen osapuolen komponentti |
| `newCode()` | Backend-kutsu API:in | Supabase Edge Function |

### 1.5 Data-mutaatiot (nyt kovakoodatut)

#### 🔧 Korvautuvat Supabase-kutsuilla

Nämä muokkaavat globaaleja taulukoita (`BP.push(...)`, `MEDS.push(...)`). React-sovelluksessa korvataan `supabase.from('...').insert(...)` -kutsuilla.

| Funktio | Nykyinen toiminta | Uusi toteutus |
|---------|-------------------|---------------|
| `$('entSave').onclick` | Lisää `BP`, `GLU`, `WT`, `LABS`, `MEDS` taulukoihin | `INSERT INTO measurements/lab_results/medications` |
| `addSymptom(name)` | Lisää `SYMS`-taulukkoon | `INSERT INTO symptoms` (symptom_name) |
| `removeSym(i)` | Poistaa `SYMS`-taulukosta | `DELETE FROM symptoms WHERE...` (jos käyttäjän oma) |
| `updateCounts()` | Laskee `.length` globaaleista taulukoista | `SELECT COUNT(*) FROM measurements WHERE...` |
| `addLog(...)` | Lisää `LOG`-taulukkoon (paikallinen) | Ei tietokantaa — paikallinen toast-notifikaatio |
| `refresh(close)` | Kutsuu render-funktioita | React re-render automaattisesti |

**Yhteensä: ~6 data-operaatiota → Supabase-kutsut**

### 1.6 Kalenteritoiminnot

#### ✅ Siirtyvät sellaisenaan

| Funktio | Kuvaus | Uusi sijainti |
|---------|--------|--------------|
| `downloadIcs(idx)` | Luo .ics-tiedoston tapahtumasta | `src/utils/icsExport.ts` |
| `measuredOn(d)` | Tarkistaa onko päivänä mittauksia | `src/utils/carePathUtils.ts` |

---

## 2. LÄÄKÄRIPRO (Lääkärin sovellus)

### 2.1 Matemaattiset funktiot

#### ✅ Siirtyvät sellaisenaan

| Funktio | Kuvaus | Uusi sijainti |
|---------|--------|--------------|
| `ka7(bp)` | Laskee 7 vrk keskiarvon | `src/utils/calculations.ts` (sama kuin `rolling`) |
| `rolling(bp)` | Sama kuin Hoitopolussa | `src/utils/calculations.ts` |

#### 🚫 Poistetaan

| Funktio | Syy |
|---------|-----|
| `genBP(base, trend, noise, medDay)` | Testidatan generointi — ei tarvita tuotannossa |

### 2.2 Jako/koodi-toiminnot

#### 🔧 Korvautuu Supabase-logiikalla

| Funktio | Nykyinen toiminta | Uusi toteutus |
|---------|-------------------|---------------|
| `decodeShare(s)` | Purkaa base64-koodatun jakolinkin | `SELECT * FROM patients WHERE share_code = $1` (jos jatketaan koodijärjestelmää) |
| `snapToPatient(snap)` | Lataa potilaan tiedot `CUR`-objektiin | `SELECT * FROM care_paths JOIN patients...` |
| `openCode()` | Avaa potilaan koodilla | `SELECT * FROM care_paths WHERE access_code = $1` + RLS-tarkistus |
| `openPatient(id)` | Avaa potilaan ID:llä | `SELECT * FROM care_paths WHERE patient_id = $1` + `INSERT INTO access_log` |
| `openSnapshotPatient(snap)` | Lataa jaetun datan | `SELECT ... WHERE share_token = $1` (jos jatketaan) |

### 2.3 UI-renderöinti

#### ⚠️ Vaativat refaktorointia

| Funktio | React-komponentti | Data Supabasesta |
|---------|-------------------|------------------|
| `renderDash()` | `<DoctorDashboard />` | `SELECT * FROM care_paths WHERE doctor_id = ...` |
| `renderPatient(CUR)` | `<PatientView />` | Koko potilaan data |
| `drawChart(CUR)` | `<PatientGraph />` | Sama piirtologiikka kuin Hoitopolussa |
| `renderInsights(CUR)` | `<Insights />` | Laskettu client-puolella |
| `renderMeas(CUR)` | `<MeasurementSummary />` | `SELECT * FROM measurements WHERE...` |
| `renderMeds(CUR)` | `<MedicationList />` | `SELECT * FROM medications WHERE...` |
| `renderSym(CUR)` | `<SymptomGrid />` | `SELECT * FROM symptoms WHERE...` |

### 2.4 AI-lausuntoapuri

#### 🔄 Siirtyy API-proxyn taakse

| Funktio | Nykyinen toiminta | Uusi toteutus |
|---------|-------------------|---------------|
| `generate(type)` | `fetch('https://api.anthropic.com/...')` suoraan selaimesta | Backend Edge Function → `POST /api/ai/generate` |
| `localDraft(CUR, type)` | Luo varalausunnon ilman AI:ta | Säilyy sellaisenaan client-puolella, fallback |

**Tärkeä turvallisuusmuutos:** API-avain siirtyy backend-proxyn ympäristömuuttujaan.

### 2.5 Navigaatio

#### ⚠️ Refaktorointi

| Funktio | React-toteutus |
|---------|----------------|
| `showView(v)` | React Router tai state-pohjainen näkymävaihto |
| `setTab(t)` | `<Tabs>` komponentti + state |
| `signIn()` | `supabase.auth.signInWithPassword()` |

### 2.6 Notifikaatiot

#### ✅ Siirtyy kolmannen osapuolen kirjastoon

| Funktio | Uusi toteutus |
|---------|---------------|
| `toast(t)` | `react-hot-toast` tai `sonner` |

---

## 3. Yhteenveto numeroina

### Hoitopolku

| Kategoria | Määrä | Kommentti |
|-----------|-------|-----------|
| ✅ Siirtyy sellaisenaan | **12** | Matemaattiset ja aputoiminnot |
| 🔄 Pienin muutoksin | **5** | Piirto + laskenta, data muuttuu |
| ⚠️ Refaktorointi | **26** | DOM → React komponentit |
| 🔧 Supabase-kutsut | **6** | Data-mutaatiot |
| 🚫 Poistetaan | **1** | `gen()` testidatageneraattori |

**Yhteensä: 50 funktiota**

### LääkäriPRO

| Kategoria | Määrä | Kommentti |
|-----------|-------|-----------|
| ✅ Siirtyy sellaisenaan | **3** | Matematiikka + ICS-vienti |
| 🔄 Pienin muutoksin | **2** | AI-proxy, lokaali fallback |
| ⚠️ Refaktorointi | **10** | UI-komponentit |
| 🔧 Supabase-kutsut | **5** | Jako/koodi, access log |
| 🚫 Poistetaan | **1** | `genBP()` |

**Yhteensä: 21 funktiota**

---

## 4. Suositeltava toteutusjärjestys

### Vaihe 1: Luo ydinlaskentakirjasto

Nämä ovat puhtaita funktioita — ei riippuvuuksia, helppo testata:

```
src/utils/
├── calculations.ts       (rolling, project, tileState, bpSeriesProgress)
├── formatting.ts         (fmt, clock, fmtDate)
├── dateUtils.ts          (dateForDay, sameDay)
├── graphUtils.ts         (smooth)
└── parsing.ts            (num)
```

**Testi:** Kopioi funktiot, kirjoita unit-testit, varmista että tulokset täsmäävät demon kanssa.

### Vaihe 2: Rakenna React-komponentit

Aloita yksinkertaisimmista:

1. `<Sparkline />` — puhdas visualisaatio
2. `<MetricTile />` — ottaa datan propsina
3. `<BigGraph />` — monimutkaisempi, mutta sama piirtologiikka
4. `<MeasurementModal />` — lomake + validointi

### Vaihe 3: Supabase-datakerros

Luo custom hookit datahakuun:

```typescript
// src/hooks/useMeasurements.ts
export function useMeasurements(carePathId: string) {
  const { data, error } = useQuery(
    supabase
      .from('measurements')
      .select('*')
      .eq('care_path_id', carePathId)
      .order('measured_at', { ascending: false })
  );
  return { measurements: data, error };
}
```

### Vaihe 4: Korvaa demo-data oikealla datalla

Nyt kun komponentit ja hookit ovat valmiit, liitä ne yhteen:

```tsx
function Dashboard() {
  const { carePathId } = useAuth();
  const { measurements } = useMeasurements(carePathId);
  const bloodPressure = measurements.filter(m => m.measurement_type === 'blood_pressure');
  
  return <MetricTiles data={bloodPressure} />;
}
```

---

## 5. Mitä EI pidä tehdä

❌ **Älä yritä siirtää `<script>`-osiota sellaisenaan** — React ei toimi niin.
  
❌ **Älä kopioi DOM-manipulaatiota** (`innerHTML`, `appendChild`) — käytä JSX:ää.
  
❌ **Älä säilytä globaaleja muuttujia** (`BP`, `MEDS`, `CUR`) — käytä React staten ja Supabasen yhdistelmää.
  
❌ **Älä jätä AI-kutsua suoraan selaimeen** — API-avain on palvelimella.

---

## 6. Mitä tämä analyysi osoittaa

✅ **Hyvä uutinen:** ~40 % koodista (matemaattiset funktiot, piirtologiikka) siirtyy lähes sellaisenaan.
  
✅ **Arkkitehtuuri on hyvä:** Demot ovat jo kirjoitettu funktionaalisesti, ei spagettikoodia.
  
⚠️ **Työmäärä on kohtuullinen:** UI-kerroksen uudelleenkirjoitus React-komponenteiksi vie eniten aikaa, mutta logiikka säilyy.
  
⚠️ **Tietokanta on kriittinen:** RLS-säännöt ja access_log ovat uusia osia, jotka eivät ole demossa — ne pitää suunnitella ja testata huolellisesti.

---

## Liittyvät dokumentit

- [Tekninen siirtymäsuunnitelma](./TECH_MIGRATION_PLAN.md) - Kokonaisarkkitehtuuri
- [Supabase-schema](../supabase/migrations/20260904000000_initial_schema.sql) - Tietokantamalli
