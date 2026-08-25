alter table public.audit_log
  alter column id set default 'aud_' || replace(extensions.gen_random_uuid()::text, '-', '');

-- Lokitus tehdaan triggerilla eika sovelluksessa, koska sovellus voi
-- unohtaa kirjata mutta trigger ei. Kirjaus tapahtuu samassa
-- transaktiossa kuin muutos, joten loki ja data eivat voi eriytya.
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

  begin
    if tg_table_name = 'bp_measurements' then
      potilas := coalesce(new.patient_id, old.patient_id);
    elsif tg_table_name = 'baselines' then
      potilas := coalesce(new.patient_id, old.patient_id);
    elsif tg_table_name = 'steps' then
      potilas := coalesce(new.patient_id, old.patient_id);
    else
      potilas := null;
    end if;
  exception when others then
    potilas := null;
  end;

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

-- 'system' tarvitaan kayttajaksi, koska audit_log.actor_id viittaa
-- users-tauluun ja palvelinpuolen ajoilla ei ole sovellustunnusta.
insert into public.users (id, email, role)
values ('system', 'system@hoitopolku.ai', 'yllapito')
on conflict (id) do nothing;

drop trigger if exists audit_bp on public.bp_measurements;
create trigger audit_bp
  after insert or update or delete on public.bp_measurements
  for each row execute function public.kirjaa_audit();

drop trigger if exists audit_baselines on public.baselines;
create trigger audit_baselines
  after insert or update or delete on public.baselines
  for each row execute function public.kirjaa_audit();

drop trigger if exists audit_steps on public.steps;
create trigger audit_steps
  after insert or update or delete on public.steps
  for each row execute function public.kirjaa_audit();

drop trigger if exists audit_enrollments on public.enrollments;
create trigger audit_enrollments
  after insert or update or delete on public.enrollments
  for each row execute function public.kirjaa_audit();
