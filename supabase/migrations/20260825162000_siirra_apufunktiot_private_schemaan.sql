set local search_path = public;

-- Apufunktiot olivat public-schemassa, joten PostgREST julkaisi ne
-- /rest/v1/rpc/-osoitteina. Kirjautunut kayttaja pystyi esimerkiksi
-- kysymaan is_my_patient('joku_tunnus') ja paattelemaan hoitosuhteita.
-- Policyt tarvitsevat funktiot, mutta rajapinnan ei tarvitse paljastaa niita.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.app_user_id()
returns text language sql stable security definer set search_path = '' as $$
  select u.id from public.users u where u.auth_user_id = auth.uid();
$$;

create or replace function private.app_role()
returns text language sql stable security definer set search_path = '' as $$
  select u.role from public.users u where u.auth_user_id = auth.uid();
$$;

create or replace function private.is_my_patient(p_patient_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.patient_id = p_patient_id
      and e.doctor_id = private.app_user_id()
      and e.status = 'active'
  );
$$;

create or replace function private.is_my_doctor(kohde text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    where e.doctor_id = kohde
      and e.patient_id = private.app_user_id()
      and e.status = 'active'
  );
$$;

revoke all on function private.app_user_id()            from public;
revoke all on function private.app_role()               from public;
revoke all on function private.is_my_patient(text)      from public;
revoke all on function private.is_my_doctor(text)       from public;
grant execute on function private.app_user_id()         to authenticated;
grant execute on function private.app_role()            to authenticated;
grant execute on function private.is_my_patient(text)   to authenticated;
grant execute on function private.is_my_doctor(text)    to authenticated;

-- Policyt paivitetaan ohjelmallisesti, jotta yhtakaan niista ei jaa
-- vahingossa osoittamaan poistettuun funktioon.
do $$
declare
  r record;
  u text;
  c text;
  komento text;
  kuvio text := '(^|[^.[:alnum:]_])(app_user_id|app_role|is_my_patient|is_my_doctor)\(';
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    u := r.qual;
    c := r.with_check;
    if u is not null then u := regexp_replace(u, kuvio, '\1private.\2(', 'g'); end if;
    if c is not null then c := regexp_replace(c, kuvio, '\1private.\2(', 'g'); end if;

    if u is distinct from r.qual or c is distinct from r.with_check then
      komento := format('alter policy %I on public.%I', r.policyname, r.tablename);
      if u is not null then komento := komento || format(' using (%s)', u); end if;
      if c is not null then komento := komento || format(' with check (%s)', c); end if;
      execute komento;
    end if;
  end loop;
end $$;

-- Triggerifunktiot siirretaan samaan schemaan, jotta public jaa pelkiksi
-- tauluiksi eika sinne voi vahingossa myontaa oikeuksia.
create or replace function private.kirjaa_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  tekija text;
  kohde_id text;
  potilas text;
begin
  tekija := private.app_user_id();
  if tekija is null then
    tekija := 'system';
  end if;

  if tg_op = 'DELETE' then
    kohde_id := old.id;
  else
    kohde_id := new.id;
  end if;

  potilas := coalesce(to_jsonb(new) ->> 'patient_id', to_jsonb(old) ->> 'patient_id');

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (
    tekija, lower(tg_op), tg_table_name, kohde_id,
    case when potilas is null then null
         else json_build_object('patient_id', potilas)::text end
  );

  return coalesce(new, old);
end $$;

create or replace function private.aseta_tehtavan_kuittaus()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.done and not old.done then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function private.kirjaa_audit()             from public;
revoke all on function private.aseta_tehtavan_kuittaus()  from public;

drop trigger if exists audit_bp          on public.bp_measurements;
drop trigger if exists audit_baselines   on public.baselines;
drop trigger if exists audit_steps       on public.steps;
drop trigger if exists audit_enrollments on public.enrollments;
drop trigger if exists audit_metrics     on public.metric_measurements;
drop trigger if exists audit_symptoms    on public.symptom_reports;
drop trigger if exists audit_tasks       on public.patient_tasks;
drop trigger if exists tasks_kuittaus    on public.patient_tasks;

create trigger audit_bp          after insert or update or delete on public.bp_measurements     for each row execute function private.kirjaa_audit();
create trigger audit_baselines   after insert or update or delete on public.baselines           for each row execute function private.kirjaa_audit();
create trigger audit_steps       after insert or update or delete on public.steps               for each row execute function private.kirjaa_audit();
create trigger audit_enrollments after insert or update or delete on public.enrollments         for each row execute function private.kirjaa_audit();
create trigger audit_metrics     after insert or update or delete on public.metric_measurements for each row execute function private.kirjaa_audit();
create trigger audit_symptoms    after insert or update or delete on public.symptom_reports     for each row execute function private.kirjaa_audit();
create trigger audit_tasks       after insert or update or delete on public.patient_tasks       for each row execute function private.kirjaa_audit();
create trigger tasks_kuittaus    before update                    on public.patient_tasks       for each row execute function private.aseta_tehtavan_kuittaus();

drop function if exists public.kirjaa_audit();
drop function if exists public.aseta_tehtavan_kuittaus();
drop function if exists public.is_my_doctor(text);
drop function if exists public.is_my_patient(text);
drop function if exists public.app_role();
drop function if exists public.app_user_id();
