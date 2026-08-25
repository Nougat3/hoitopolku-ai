-- Periaatteet:
--  * potilas nakee ja kirjaa vain omat tietonsa
--  * laakari nakee vain niiden potilaiden tiedot joihin on aktiivinen hoitosuhde
--  * potilastietoa ei poisteta selaimesta lainkaan
--  * audit_log on vain kirjoitettava, ei luettava eika muutettava

-- ── users ────────────────────────────────────────────────────────────
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_my_patient(id));

-- Paivitys vain omaan riviin. Roolin muutos estetaan sarakeoikeudella
-- alempana, koska policy ei voi rajata yksittaista saraketta.
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ── enrollments ──────────────────────────────────────────────────────
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select to authenticated
  using (patient_id = public.app_user_id() or doctor_id = public.app_user_id());

-- ── bp_measurements ──────────────────────────────────────────────────
drop policy if exists bp_select on public.bp_measurements;
create policy bp_select on public.bp_measurements
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

-- Potilas kirjaa vain omalle nimelleen. with check estaa toisen
-- potilaan tunnuksella kirjaamisen.
drop policy if exists bp_insert_own on public.bp_measurements;
create policy bp_insert_own on public.bp_measurements
  for insert to authenticated
  with check (patient_id = public.app_user_id());

-- ── baselines ────────────────────────────────────────────────────────
drop policy if exists baselines_select on public.baselines;
create policy baselines_select on public.baselines
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

-- Lahtotasot tulevat laboratoriosta laakarin kirjaamana.
drop policy if exists baselines_write_doctor on public.baselines;
create policy baselines_write_doctor on public.baselines
  for insert to authenticated
  with check (public.is_my_patient(patient_id));

drop policy if exists baselines_update_doctor on public.baselines;
create policy baselines_update_doctor on public.baselines
  for update to authenticated
  using (public.is_my_patient(patient_id))
  with check (public.is_my_patient(patient_id));

-- ── steps ────────────────────────────────────────────────────────────
drop policy if exists steps_select on public.steps;
create policy steps_select on public.steps
  for select to authenticated
  using (patient_id = public.app_user_id() or public.is_my_patient(patient_id));

drop policy if exists steps_write_doctor on public.steps;
create policy steps_write_doctor on public.steps
  for insert to authenticated
  with check (public.is_my_patient(patient_id));

drop policy if exists steps_update_doctor on public.steps;
create policy steps_update_doctor on public.steps
  for update to authenticated
  using (public.is_my_patient(patient_id))
  with check (public.is_my_patient(patient_id));

-- ── consents ─────────────────────────────────────────────────────────
-- Suostumushistoria on muuttumaton: vain luku ja lisays.
drop policy if exists consents_select_own on public.consents;
create policy consents_select_own on public.consents
  for select to authenticated
  using (user_id = public.app_user_id() or public.is_my_patient(user_id));

drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
  for insert to authenticated
  with check (user_id = public.app_user_id());

-- ── htn_evidence ─────────────────────────────────────────────────────
drop policy if exists htn_select on public.htn_evidence;
create policy htn_select on public.htn_evidence
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id
      and (e.patient_id = public.app_user_id() or e.doctor_id = public.app_user_id())
  ));

drop policy if exists htn_insert_doctor on public.htn_evidence;
create policy htn_insert_doctor on public.htn_evidence
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and e.doctor_id = public.app_user_id()
  ));

-- ── baseline_studies ─────────────────────────────────────────────────
drop policy if exists studies_select on public.baseline_studies;
create policy studies_select on public.baseline_studies
  for select to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id
      and (e.patient_id = public.app_user_id() or e.doctor_id = public.app_user_id())
  ));

drop policy if exists studies_write_doctor on public.baseline_studies;
create policy studies_write_doctor on public.baseline_studies
  for insert to authenticated
  with check (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and e.doctor_id = public.app_user_id()
  ));

drop policy if exists studies_update_doctor on public.baseline_studies;
create policy studies_update_doctor on public.baseline_studies
  for update to authenticated
  using (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and e.doctor_id = public.app_user_id()
  ))
  with check (exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id and e.doctor_id = public.app_user_id()
  ));

-- ── invites ──────────────────────────────────────────────────────────
-- Kutsun lunastus tapahtuu palvelinpuolella service_role-oikeuksin,
-- koska selain ei saa nahda muiden kutsujen token-hasheja.
drop policy if exists invites_select_doctor on public.invites;
create policy invites_select_doctor on public.invites
  for select to authenticated
  using (invited_by_id = public.app_user_id());

drop policy if exists invites_insert_doctor on public.invites;
create policy invites_insert_doctor on public.invites
  for insert to authenticated
  with check (invited_by_id = public.app_user_id() and public.app_role() = 'laakari');

-- ── audit_log ────────────────────────────────────────────────────────
-- Kirjoitettava mutta ei luettava eika muutettava. Lokin lukeminen
-- tapahtuu vain palvelinpuolelta.
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated
  with check (actor_id = public.app_user_id());
