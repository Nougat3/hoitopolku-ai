-- Aiemmin patient_id luettiin taulukohtaisella if-ketjulla, joka piti
-- muistaa paivittaa jokaisen uuden taulun kohdalla. to_jsonb lukee
-- kentan jos se on olemassa, joten uudet taulut kirjautuvat itsestaan.
create or replace function public.kirjaa_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tekija text;
  kohde_id text;
  potilas text;
begin
  tekija := public.app_user_id();

  -- Palvelinpuolen ajot (service_role, migraatiot) eivat kayta
  -- sovellustunnusta. Ne kirjataan jarjestelman nimiin.
  if tekija is null then
    tekija := 'system';
  end if;

  if tg_op = 'DELETE' then
    kohde_id := old.id;
  else
    kohde_id := new.id;
  end if;

  potilas := coalesce(
    to_jsonb(new) ->> 'patient_id',
    to_jsonb(old) ->> 'patient_id'
  );

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (
    tekija,
    lower(tg_op),
    tg_table_name,
    kohde_id,
    case when potilas is null then null
         else json_build_object('patient_id', potilas)::text end
  );

  return coalesce(new, old);
end $$;

revoke all on function public.kirjaa_audit() from public, anon, authenticated;

drop trigger if exists audit_metrics on public.metric_measurements;
create trigger audit_metrics
  after insert or update or delete on public.metric_measurements
  for each row execute function public.kirjaa_audit();

drop trigger if exists audit_symptoms on public.symptom_reports;
create trigger audit_symptoms
  after insert or update or delete on public.symptom_reports
  for each row execute function public.kirjaa_audit();

drop trigger if exists audit_tasks on public.patient_tasks;
create trigger audit_tasks
  after insert or update or delete on public.patient_tasks
  for each row execute function public.kirjaa_audit();

-- Kuittausaika asetetaan triggerilla, jotta potilaan tarvitsee kirjoittaa
-- vain done-sarake. Nain kirjoitusoikeus voidaan rajata yhteen sarakkeeseen.
create or replace function public.aseta_tehtavan_kuittaus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.done and not old.done then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.aseta_tehtavan_kuittaus() from public, anon, authenticated;

drop trigger if exists tasks_kuittaus on public.patient_tasks;
create trigger tasks_kuittaus
  before update on public.patient_tasks
  for each row execute function public.aseta_tehtavan_kuittaus();
