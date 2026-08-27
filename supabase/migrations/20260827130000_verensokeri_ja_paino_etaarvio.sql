-- Kotimittaukset etäarviota varten: verensokeri (mmol/l) + linked_metric.
-- Paino oli jo sallittu; seedataan demopotilaalle glucose-sarja.

alter table public.metric_measurements
  drop constraint if exists metric_measurements_metric_check;

alter table public.metric_measurements
  drop constraint if exists metric_measurements_value_check;

alter table public.metric_measurements
  add constraint metric_measurements_metric_check
  check (metric = any (array[
    'weight','waist','ldl','hba1c','glucose',
    'sodium','potassium','creatinine'
  ]));

alter table public.metric_measurements
  add constraint metric_measurements_value_check check (
    (metric = 'weight'     and value >= 30  and value <= 300) or
    (metric = 'waist'      and value >= 40  and value <= 200) or
    (metric = 'ldl'        and value >= 0.5 and value <= 12)  or
    (metric = 'hba1c'      and value >= 20  and value <= 150) or
    (metric = 'glucose'    and value >= 2.0 and value <= 30)  or
    (metric = 'sodium'     and value >= 100 and value <= 180) or
    (metric = 'potassium'  and value >= 2.0 and value <= 8.0) or
    (metric = 'creatinine' and value >= 20  and value <= 1000)
  );

alter table public.patient_medications
  drop constraint if exists patient_medications_linked_metric_check;

alter table public.patient_medications
  add constraint patient_medications_linked_metric_check
  check (linked_metric = any (array['bp','ldl','hba1c','weight','glucose']));

alter table public.patient_targets
  add column if not exists glucose double precision default 7.0;

comment on column public.patient_targets.glucose is
  'Kotiverensokerin tavoite mmol/l (esim. paasto).';

update public.patient_targets
set glucose = 7.0
where glucose is null;

-- Demopotilaan verensokerisarja (~6 vk, aamu/ilta) etäarvion SmartGraphia varten.
delete from public.metric_measurements
where patient_id = 'usr_potilas_demo' and metric = 'glucose';

insert into public.metric_measurements (patient_id, metric, value, measured_at, source)
select
  'usr_potilas_demo',
  'glucose',
  round((6.2 + (random() * 2.4) + case when g % 2 = 0 then 0.0 else 0.6 end)::numeric, 1),
  least(
    ((current_date - (g / 2)) + case when g % 2 = 0 then interval '7 hours' else interval '19 hours' end),
    now() - interval '5 minutes'
  ),
  'patient'
from generate_series(0, 83) as g;

-- Varmista että painoa on lähihistoriassa.
insert into public.metric_measurements (patient_id, metric, value, measured_at, source)
select 'usr_potilas_demo', 'weight', 88.4, now() - interval '2 days', 'patient'
where not exists (
  select 1 from public.metric_measurements
  where patient_id = 'usr_potilas_demo' and metric = 'weight'
    and measured_at > now() - interval '14 days'
);
