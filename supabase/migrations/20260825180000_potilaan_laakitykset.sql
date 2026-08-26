-- Potilaan laakitykset. Naytetään SmartGraphissa aloituspaivana, kun
-- linked_metric vastaa avointa mittaria (esim. verenpaine).

create table if not exists public.patient_medications (
  id text primary key default ('med_' || replace((extensions.gen_random_uuid())::text, '-', '')),
  patient_id text not null references public.users(id),
  name text not null,
  dose text not null,
  started_on date not null,
  ended_on date,
  linked_metric text not null default 'bp',
  note text,
  created_by text references public.users(id),
  created_at timestamptz not null default now(),
  constraint patient_medications_name_check
    check (char_length(trim(name)) between 1 and 120),
  constraint patient_medications_dose_check
    check (char_length(trim(dose)) between 1 and 80),
  constraint patient_medications_linked_metric_check
    check (linked_metric = any (array['bp','ldl','hba1c','weight'])),
  constraint patient_medications_note_check
    check (note is null or length(note) <= 1000),
  constraint patient_medications_dates_check
    check (ended_on is null or ended_on >= started_on)
);
comment on table public.patient_medications is
  'Potilaan laakkeet. Aloitus naykyy SmartGraphissa linked_metricin kayralla.';

create index if not exists patient_medications_patient_started_idx
  on public.patient_medications (patient_id, started_on desc);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.patient_medications enable row level security;
alter table public.patient_medications force row level security;

drop policy if exists meds_select on public.patient_medications;
create policy meds_select on public.patient_medications
  for select to authenticated
  using (patient_id = private.app_user_id() or private.is_my_patient(patient_id));

drop policy if exists meds_insert on public.patient_medications;
create policy meds_insert on public.patient_medications
  for insert to authenticated
  with check (
    (patient_id = private.app_user_id() and created_by = private.app_user_id())
    or (private.is_my_patient(patient_id) and created_by = private.app_user_id())
  );

-- Lopetuspaiva ja muistiinpano: potilas tai hoitava laakari.
drop policy if exists meds_update on public.patient_medications;
create policy meds_update on public.patient_medications
  for update to authenticated
  using (patient_id = private.app_user_id() or private.is_my_patient(patient_id))
  with check (patient_id = private.app_user_id() or private.is_my_patient(patient_id));

revoke all on table public.patient_medications from anon;
revoke delete on table public.patient_medications from authenticated;
grant select, insert, update on table public.patient_medications to authenticated;

-- ── Audit ────────────────────────────────────────────────────────────
drop trigger if exists meds_audit on public.patient_medications;
create trigger meds_audit
  after insert or update or delete on public.patient_medications
  for each row execute function private.kirjaa_audit();

-- ── Demosisalto ──────────────────────────────────────────────────────
-- Ramipril demopotilaalle: nakyy verenpainekayralla aloituspaivana.
insert into public.patient_medications (id, patient_id, name, dose, started_on, linked_metric, note, created_by)
values (
  'med_demo_ramipril',
  'usr_potilas_demo',
  'Ramipril',
  '5 mg',
  (current_date - 42),
  'bp',
  'Aloitus verenpaineen hoitoon',
  'usr_laakari_demo'
)
on conflict (id) do update set
  name = excluded.name,
  dose = excluded.dose,
  started_on = excluded.started_on,
  linked_metric = excluded.linked_metric,
  note = excluded.note;
