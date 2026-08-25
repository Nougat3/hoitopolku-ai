-- Syke ja mittausajankohta. Demo kysyy molempia, ja ajankohta on
-- hoidollisesti merkittava: aamu- ja iltamittauksia verrataan
-- toisiinsa eika sekoiteta samaan keskiarvoon.
alter table public.bp_measurements
  add column if not exists pulse integer,
  add column if not exists time_of_day text;

-- Automaattinen tunnus, jotta selaimen ei tarvitse keksia sita.
-- Selaimen antama tunnus olisi myos hyokkayspinta.
alter table public.bp_measurements
  alter column id set default 'bp_' || replace(extensions.gen_random_uuid()::text, '-', '');

alter table public.bp_measurements
  alter column measured_at set default now();

-- Kantatason validointi. Selaimessa tehty tarkistus on kayttajaa
-- varten; tama on tietoturvaa varten, koska HTTP-pyynto voidaan
-- muodostaa ilman selainta.
alter table public.bp_measurements
  drop constraint if exists bp_sys_jarkeva,
  drop constraint if exists bp_dia_jarkeva,
  drop constraint if exists bp_sys_yli_dia,
  drop constraint if exists bp_pulse_jarkeva,
  drop constraint if exists bp_time_of_day_sallittu,
  drop constraint if exists bp_ei_tulevaisuudessa;

alter table public.bp_measurements
  add constraint bp_sys_jarkeva check (sys between 70 and 260),
  add constraint bp_dia_jarkeva check (dia between 40 and 160),
  add constraint bp_sys_yli_dia check (sys > dia),
  add constraint bp_pulse_jarkeva check (pulse is null or pulse between 25 and 220),
  add constraint bp_time_of_day_sallittu check (time_of_day is null or time_of_day in ('aamu','ilta')),
  -- pieni jousto kellojen eroille, mutta ei mittauksia huomiselle
  add constraint bp_ei_tulevaisuudessa check (measured_at <= now() + interval '1 hour');

-- Roolit ja tilat rajataan, jotta kirjoitusvirhe ei tuota
-- nakymatonta oikeusongelmaa.
alter table public.users drop constraint if exists users_role_sallittu;
alter table public.users
  add constraint users_role_sallittu check (role in ('potilas','laakari','yllapito'));

alter table public.enrollments drop constraint if exists enrollments_status_sallittu;
alter table public.enrollments
  add constraint enrollments_status_sallittu check (status in ('pending','active','paused','ended'));

-- Indeksit. Yleisin kysely on yhden potilaan mittaukset
-- aikajarjestyksessa.
create index if not exists bp_patient_measured_idx
  on public.bp_measurements(patient_id, measured_at desc);

create index if not exists enrollments_patient_idx on public.enrollments(patient_id);
create index if not exists enrollments_doctor_status_idx on public.enrollments(doctor_id, status);
create index if not exists baselines_patient_idx on public.baselines(patient_id, recorded_at desc);
create index if not exists steps_patient_idx on public.steps(patient_id, created_at desc);
create index if not exists audit_actor_idx on public.audit_log(actor_id, at desc);
create index if not exists consents_user_idx on public.consents(user_id, accepted_at desc);
