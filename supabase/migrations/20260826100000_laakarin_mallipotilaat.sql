-- Nelja mallipotilasta l@demo.fi -laakarin listalle eri skenaarioilla:
-- Matti: laskusuunta Ramiprililla (olemassa)
-- Liisa: korkea BP, ei laakitysta
-- Pekka: laakityksessa mutta yha korkea + oireet
-- Sari: tavoitteessa, hyva vaste

-- ── kayttajat ──────────────────────────────────────────────────────
insert into public.users (id, email, role, full_name)
values
  ('usr_potilas_kolmas', 'potilas3@demo.hoitopolku.ai', 'potilas', 'Pekka Nieminen'),
  ('usr_potilas_neljas', 'potilas4@demo.hoitopolku.ai', 'potilas', 'Sari Laine')
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name;

update public.users set full_name = 'Liisa Virtanen' where id = 'usr_potilas_toinen';

-- ── hoitosuhteet Anna Lehtiselle ─────────────────────────────────────
update public.enrollments
set doctor_id = 'usr_laakari_demo', status = 'active'
where patient_id = 'usr_potilas_toinen';

insert into public.enrollments (id, patient_id, doctor_id, status, pregnancy_excluded)
values
  ('enr_demo_kolmas', 'usr_potilas_kolmas', 'usr_laakari_demo', 'active', true),
  ('enr_demo_neljas', 'usr_potilas_neljas', 'usr_laakari_demo', 'active', false)
on conflict (id) do update set
  doctor_id = excluded.doctor_id,
  status = excluded.status;

-- ── siivous (uudelleenajettavissa) ───────────────────────────────────
delete from public.bp_measurements where patient_id in (
  'usr_potilas_toinen', 'usr_potilas_kolmas', 'usr_potilas_neljas'
);
delete from public.patient_medications where patient_id in (
  'usr_potilas_toinen', 'usr_potilas_kolmas', 'usr_potilas_neljas'
);
delete from public.symptom_reports where patient_id in (
  'usr_potilas_toinen', 'usr_potilas_kolmas', 'usr_potilas_neljas'
);
delete from public.patient_targets where patient_id in (
  'usr_potilas_toinen', 'usr_potilas_kolmas', 'usr_potilas_neljas'
);

-- ── Liisa: korkea BP, ei laakitysta ─────────────────────────────────
with paivat as (
  select d, 161.0 + (random() - 0.5) * 10 as base
  from generate_series(0, 55) as d
),
kirjaukset as (
  select d, base + 2 as keskus, 'aamu' as tod, interval '7 hours 20 minutes' as kello from paivat
  union all
  select d, base - 3 as keskus, 'ilta' as tod, interval '20 hours 15 minutes' as kello from paivat
),
arvot as (
  select k.tod,
         (current_date - (55 - k.d)) + k.kello as hetki,
         greatest(70, least(260, round(k.keskus + (random() - 0.5) * 16)))::int as sys
  from kirjaukset k
  where random() > 0.15
)
insert into public.bp_measurements (patient_id, sys, dia, pulse, time_of_day, measured_at)
select 'usr_potilas_toinen', a.sys,
       greatest(40, least(160, round(a.sys * 0.62 + (random() - 0.5) * 5)))::int,
       round(68 + (random() - 0.5) * 10)::int,
       a.tod, a.hetki
from arvot a
where a.hetki <= now();

insert into public.patient_targets (patient_id, bp_sys, bp_dia)
values ('usr_potilas_toinen', 135, 85)
on conflict (patient_id) do update set bp_sys = 135, bp_dia = 85;

insert into public.symptom_reports (patient_id, symptoms, severity, note, reported_at)
values (
  'usr_potilas_toinen',
  array['Päänsärky'],
  2,
  'Aamuisin, ei joka päivä',
  now() - interval '4 days'
);

-- ── Pekka: Amlodipiini, yha korkea + oireet ─────────────────────────
with paivat as (
  select d,
         case when d < 21 then 158.0 else 152.0 end + (random() - 0.5) * 8 as base
  from generate_series(0, 55) as d
),
kirjaukset as (
  select d, base + 2 as keskus, 'aamu' as tod, interval '7 hours' as kello from paivat
  union all
  select d, base - 2 as keskus, 'ilta' as tod, interval '20 hours 30 minutes' as kello from paivat
),
arvot as (
  select k.tod,
         (current_date - (55 - k.d)) + k.kello as hetki,
         greatest(70, least(260, round(k.keskus + (random() - 0.5) * 14)))::int as sys
  from kirjaukset k
  where random() > 0.14
)
insert into public.bp_measurements (patient_id, sys, dia, pulse, time_of_day, measured_at)
select 'usr_potilas_kolmas', a.sys,
       greatest(40, least(160, round(a.sys * 0.63 + (random() - 0.5) * 5)))::int,
       round(70 + (random() - 0.5) * 12)::int,
       a.tod, a.hetki
from arvot a
where a.hetki <= now();

insert into public.patient_medications (id, patient_id, name, dose, started_on, linked_metric, note, created_by)
values (
  'med_demo_amlodipiini',
  'usr_potilas_kolmas',
  'Amlodipiini',
  '10 mg',
  (current_date - 35),
  'bp',
  'Aloitus verenpaineen hoitoon',
  'usr_laakari_demo'
)
on conflict (id) do update set
  started_on = excluded.started_on,
  dose = excluded.dose;

insert into public.patient_targets (patient_id, bp_sys, bp_dia)
values ('usr_potilas_kolmas', 135, 85)
on conflict (patient_id) do update set bp_sys = 135, bp_dia = 85;

insert into public.symptom_reports (patient_id, symptoms, severity, note, reported_at)
values
  ('usr_potilas_kolmas', array['Huimaus', 'Väsymys'], 4, 'Iltapäivisin seisomaan noustessa', now() - interval '2 days'),
  ('usr_potilas_kolmas', array['Päänsärky'], 3, null, now() - interval '9 days');

-- ── Sari: tavoitteessa, Ramipril vaikuttaa ───────────────────────────
with paivat as (
  select d,
         148.0
         - least(14.0, greatest(0, d - 14) * 0.45)
         - least(6.0, greatest(0, d - 42) * 0.2) as base
  from generate_series(0, 55) as d
),
kirjaukset as (
  select d, base + 1 as keskus, 'aamu' as tod, interval '7 hours 30 minutes' as kello from paivat
  union all
  select d, base - 2 as keskus, 'ilta' as tod, interval '20 hours' as kello from paivat
),
arvot as (
  select k.tod,
         (current_date - (55 - k.d)) + k.kello as hetki,
         greatest(70, least(260, round(k.keskus + (random() - 0.5) * 12)))::int as sys
  from kirjaukset k
  where random() > 0.13
)
insert into public.bp_measurements (patient_id, sys, dia, pulse, time_of_day, measured_at)
select 'usr_potilas_neljas', a.sys,
       greatest(40, least(160, round(a.sys * 0.61 + (random() - 0.5) * 4)))::int,
       round(64 + (random() - 0.5) * 8)::int,
       a.tod, a.hetki
from arvot a
where a.hetki <= now();

insert into public.patient_medications (id, patient_id, name, dose, started_on, linked_metric, note, created_by)
values (
  'med_demo_sari_ramipril',
  'usr_potilas_neljas',
  'Ramipril',
  '5 mg',
  (current_date - 49),
  'bp',
  'Aloitus verenpaineen hoitoon',
  'usr_laakari_demo'
)
on conflict (id) do update set
  started_on = excluded.started_on;

insert into public.patient_targets (patient_id, bp_sys, bp_dia)
values ('usr_potilas_neljas', 135, 85)
on conflict (patient_id) do update set bp_sys = 135, bp_dia = 85;
