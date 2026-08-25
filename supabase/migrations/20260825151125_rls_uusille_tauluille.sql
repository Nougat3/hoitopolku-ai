-- Sama periaate kuin muissa potilastauluissa: potilas nakee ja kirjaa vain
-- omat tietonsa, laakari nakee vain hoitosuhteessa olevien potilaiden tiedot.

-- ── metric_measurements ──────────────────────────────────────────────
drop policy if exists metrics_select on public.metric_measurements;
create policy metrics_select on public.metric_measurements
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

-- Potilaan kirjaus merkitaan aina potilaan itse ilmoittamaksi, jotta
-- laboratorion vahvistamaa arvoa ei voi teeskennella.
drop policy if exists metrics_insert_own on public.metric_measurements;
create policy metrics_insert_own on public.metric_measurements
  for insert to authenticated
  with check (
    (patient_id = public.app_user_id() and source = 'patient')
    or public.is_my_patient(patient_id)
  );

-- ── symptom_reports ──────────────────────────────────────────────────
drop policy if exists symptoms_select on public.symptom_reports;
create policy symptoms_select on public.symptom_reports
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

drop policy if exists symptoms_insert_own on public.symptom_reports;
create policy symptoms_insert_own on public.symptom_reports
  for insert to authenticated
  with check (patient_id = public.app_user_id());

-- ── patient_tasks ────────────────────────────────────────────────────
drop policy if exists tasks_select on public.patient_tasks;
create policy tasks_select on public.patient_tasks
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

-- Potilas kuittaa oman tehtavansa. Rajaus vain done-sarakkeeseen tehdaan
-- sarakeoikeudella alempana, koska policy ei osaa rajata saraketta.
drop policy if exists tasks_update_own on public.patient_tasks;
create policy tasks_update_own on public.patient_tasks
  for update to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id))
  with check (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

drop policy if exists tasks_insert_doctor on public.patient_tasks;
create policy tasks_insert_doctor on public.patient_tasks
  for insert to authenticated
  with check (public.is_my_patient(patient_id));

-- ── care_events ──────────────────────────────────────────────────────
drop policy if exists events_select on public.care_events;
create policy events_select on public.care_events
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

drop policy if exists events_insert_doctor on public.care_events;
create policy events_insert_doctor on public.care_events
  for insert to authenticated
  with check (public.is_my_patient(patient_id));

drop policy if exists events_update_doctor on public.care_events;
create policy events_update_doctor on public.care_events
  for update to authenticated
  using (public.is_my_patient(patient_id))
  with check (public.is_my_patient(patient_id));

-- ── patient_targets ──────────────────────────────────────────────────
drop policy if exists targets_select on public.patient_targets;
create policy targets_select on public.patient_targets
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

drop policy if exists targets_write_doctor on public.patient_targets;
create policy targets_write_doctor on public.patient_targets
  for insert to authenticated
  with check (public.is_my_patient(patient_id));

drop policy if exists targets_update_doctor on public.patient_targets;
create policy targets_update_doctor on public.patient_targets
  for update to authenticated
  using (public.is_my_patient(patient_id))
  with check (public.is_my_patient(patient_id));

-- ── oikeudet ─────────────────────────────────────────────────────────
-- Potilastietoa ei poisteta selaimesta lainkaan.
revoke delete on public.metric_measurements from authenticated, anon;
revoke delete on public.symptom_reports    from authenticated, anon;
revoke delete on public.patient_tasks      from authenticated, anon;
revoke delete on public.care_events        from authenticated, anon;
revoke delete on public.patient_targets    from authenticated, anon;

-- Kirjattua mittausta tai oiretta ei muuteta jalkikateen; korjaus tehdaan
-- uudella kirjauksella, jotta historia sailyy.
revoke update on public.metric_measurements from authenticated, anon;
revoke update on public.symptom_reports     from authenticated, anon;

-- Tehtavasta potilas saa muuttaa vain kuittauksen. Taulutason oikeus on
-- poistettava ensin, koska se ohittaisi sarakekohtaisen rajauksen.
revoke update on public.patient_tasks from authenticated, anon;
grant update (done) on public.patient_tasks to authenticated;

-- Kirjautumaton kaviija ei paase potilastietoon lainkaan.
revoke all on public.metric_measurements from anon;
revoke all on public.symptom_reports     from anon;
revoke all on public.patient_tasks       from anon;
revoke all on public.care_events         from anon;
revoke all on public.patient_targets     from anon;

alter table public.metric_measurements enable row level security;
alter table public.symptom_reports     enable row level security;
alter table public.patient_tasks       enable row level security;
alter table public.care_events         enable row level security;
alter table public.patient_targets     enable row level security;

alter table public.metric_measurements force row level security;
alter table public.symptom_reports     force row level security;
