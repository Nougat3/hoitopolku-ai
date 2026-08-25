-- Naytettavat nimet: sovellus tervehtii potilasta etunimella ja nayttaa laakarin tiedot.
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists title text;
comment on column public.users.full_name is 'Koko nimi kayttoliittymassa. Erillinen sahkopostista, jota ei nayteta potilaalle.';
comment on column public.users.title is 'Ammattinimike, nakyy potilaalle laakarin kortissa.';

-- Verenpaineen lisaksi seurattavat luvut aikasarjana. bp_measurements kattaa
-- verenpaineen, baselines vain kertaluonteisen lahtotason.
create table if not exists public.metric_measurements (
  id text primary key default ('met_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  metric text not null,
  value double precision not null,
  measured_at timestamptz not null default now(),
  source text not null default 'patient',
  created_at timestamptz not null default now(),
  constraint metric_measurements_metric_check
    check (metric = any (array['weight','waist','ldl','hba1c'])),
  constraint metric_measurements_source_check
    check (source = any (array['patient','lab','clinic'])),
  constraint metric_measurements_measured_at_check
    check (measured_at <= now() + interval '1 hour'),
  -- Jokaiselle luvulle oma jarkeva vaihteluvali, sama kuin lomakkeen validoinnissa.
  constraint metric_measurements_value_check check (
    (metric = 'weight' and value >= 30  and value <= 300) or
    (metric = 'waist'  and value >= 40  and value <= 200) or
    (metric = 'ldl'    and value >= 0.5 and value <= 12)  or
    (metric = 'hba1c'  and value >= 20  and value <= 150)
  )
);
comment on table public.metric_measurements is 'Paino, vyotaronympatys, LDL ja HbA1c aikasarjana.';

-- Oirekyselyt: potilaan kirjaamat oireet ja haitta-aste.
create table if not exists public.symptom_reports (
  id text primary key default ('sx_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  symptoms text[] not null,
  severity integer,
  note text,
  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint symptom_reports_symptoms_check
    check (array_length(symptoms, 1) between 1 and 20),
  constraint symptom_reports_severity_check
    check (severity is null or (severity between 1 and 5)),
  constraint symptom_reports_note_check
    check (note is null or length(note) <= 2000),
  constraint symptom_reports_reported_at_check
    check (reported_at <= now() + interval '1 hour')
);
comment on table public.symptom_reports is 'Potilaan oirekyselyt. Laakari lukee ennen vastaanottoa.';

-- Hoitopolun tehtavat. Laakari tai jarjestelma luo, potilas kuittaa tehdyksi.
create table if not exists public.patient_tasks (
  id text primary key default ('tsk_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  title text not null,
  detail text,
  due_hint text,
  target_view text,
  sort_order integer not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_tasks_target_view_check
    check (target_view is null or target_view = any (array['mittaa','kysely','hoitopolku','seuranta']))
);
comment on table public.patient_tasks is 'Hoitopolun tehtavat. Potilas saa muuttaa vain done-saraketta.';
comment on column public.patient_tasks.target_view is 'Jos asetettu, tehtava avaa nakyman sen sijaan etta kuittaisi itsensa.';

-- Hoitopolun aikajana. Korvaa kovakoodatut paivamaarat.
create table if not exists public.care_events (
  id text primary key default ('evt_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  title text not null,
  detail text,
  when_label text not null,
  status text not null default 'next',
  card_note text,
  card_button text,
  sort_order integer not null default 0,
  occurs_at timestamptz,
  created_at timestamptz not null default now(),
  constraint care_events_status_check
    check (status = any (array['done','now','next']))
);
comment on table public.care_events is 'Potilaan hoitopolun tapahtumat aikajarjestyksessa.';

-- Tavoitearvot. Yksi rivi potilasta kohti.
create table if not exists public.patient_targets (
  patient_id text primary key references public.users(id),
  bp_sys integer not null default 135,
  bp_dia integer not null default 85,
  ldl double precision not null default 2.6,
  hba1c integer not null default 53,
  weight double precision,
  weight_note text,
  updated_at timestamptz not null default now()
);
comment on table public.patient_targets is 'Laakarin asettamat tavoitearvot, nakyvat potilaalle seurannassa.';

create index if not exists metric_measurements_patient_metric_idx
  on public.metric_measurements (patient_id, metric, measured_at desc);
create index if not exists symptom_reports_patient_idx
  on public.symptom_reports (patient_id, reported_at desc);
create index if not exists patient_tasks_patient_idx
  on public.patient_tasks (patient_id, sort_order);
create index if not exists care_events_patient_idx
  on public.care_events (patient_id, sort_order);
