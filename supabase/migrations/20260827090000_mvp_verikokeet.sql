-- MVP: potilas kirjaa labratulokset itse (Na, K, krea). Ei analyysia.
-- Arvot naytetaan sellaisenaan potilaalle ja laakarille.

alter table public.metric_measurements
  drop constraint if exists metric_measurements_metric_check;

alter table public.metric_measurements
  drop constraint if exists metric_measurements_value_check;

alter table public.metric_measurements
  add constraint metric_measurements_metric_check
  check (metric = any (array[
    'weight','waist','ldl','hba1c',
    'sodium','potassium','creatinine'
  ]));

alter table public.metric_measurements
  add constraint metric_measurements_value_check check (
    (metric = 'weight'     and value >= 30  and value <= 300) or
    (metric = 'waist'      and value >= 40  and value <= 200) or
    (metric = 'ldl'        and value >= 0.5 and value <= 12)  or
    (metric = 'hba1c'      and value >= 20  and value <= 150) or
    (metric = 'sodium'     and value >= 100 and value <= 180) or
    (metric = 'potassium'  and value >= 2.0 and value <= 8.0) or
    (metric = 'creatinine' and value >= 20  and value <= 1000)
  );

comment on table public.metric_measurements is
  'Mittaukset ja labratulokset. MVP: potilas kirjaa Na/K/krea itse, ei analyysia.';
