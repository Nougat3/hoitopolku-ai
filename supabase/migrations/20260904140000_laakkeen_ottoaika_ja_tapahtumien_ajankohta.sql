-- Laakkeen ottoaika ja hoitopolun tapahtumien ajankohta.
--
-- Potilassovellus kysyi jo "milloin otat laakkeen?", mutta vastaus jai vain
-- selaimeen: kannassa ei ollut saraketta johon se olisi mahtunut. Samoin
-- kalenterinakymalla ei ollut mitaan mihin kiinnittya, koska care_events-rivien
-- occurs_at oli kaikilla tyhja.

alter table public.patient_medications
  add column if not exists time_of_day text not null default 'aamu';

alter table public.patient_medications
  drop constraint if exists patient_medications_time_of_day_check;

alter table public.patient_medications
  add constraint patient_medications_time_of_day_check
  check (time_of_day in ('aamu', 'ilta', 'aamu_ilta'));

comment on column public.patient_medications.time_of_day is
  'Milloin laake otetaan: aamu, ilta tai molemmat (aamu_ilta).';

-- Taman taulun oikeudet on myonnetty sarakekohtaisesti, joten uusi sarake jaa
-- ilman oikeuksia ellei sita myonneta erikseen.
grant select (time_of_day), insert (time_of_day), update (time_of_day)
  on public.patient_medications to authenticated;

-- Hoitopolun tapahtumien ajankohta johdetaan when_label-tekstista suhteessa
-- hoidon alkuun (ensimmainen verenpainemittaus). Vain tyhjat taytetaan, jotta
-- laakarin myohemmin asettamat ajat sailyvat.
with anchor as (
  select
    e.id,
    e.when_label,
    coalesce(
      (select min(b.measured_at) from public.bp_measurements b where b.patient_id = e.patient_id),
      e.created_at
    ) as care_start
  from public.care_events e
  where e.occurs_at is null
)
update public.care_events e
set occurs_at = case
  when a.when_label ~ '^Viikko\s+(\d+)'
    then date_trunc('day', a.care_start)
         + make_interval(weeks => (substring(a.when_label from '^Viikko\s+(\d+)'))::int - 1)
         + interval '9 hours'
  when a.when_label ~ '^Kuukausi\s+(\d+)'
    then date_trunc('day', a.care_start)
         + make_interval(months => (substring(a.when_label from '^Kuukausi\s+(\d+)'))::int)
         + interval '9 hours'
  when a.when_label ilike 'ensi viikolla'
    then date_trunc('day', now()) + interval '7 days' + interval '14 hours 20 minutes'
  else null
end
from anchor a
where e.id = a.id;
