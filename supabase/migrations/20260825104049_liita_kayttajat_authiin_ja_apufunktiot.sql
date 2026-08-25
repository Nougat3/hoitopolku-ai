-- Sovellustaulun users.id on tekstimuotoinen ja siihen osoittaa kymmenen
-- viiteavainta, joten id:tä ei migratoida uuid:ksi. Sen sijaan lisätään
-- erillinen liitos Supabase Authiin.
alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

comment on column public.users.auth_user_id is
  'Liitos Supabase Authiin. on delete set null, jotta potilastieto ja audit trail sailyvat vaikka kirjautumistili poistetaan.';

create index if not exists users_auth_user_id_idx on public.users(auth_user_id);

-- Apufunktiot policyille. SECURITY DEFINER on valttamaton: ilman sita
-- users-taulun policy joutuisi kysymaan users-taulusta ja aiheuttaisi
-- aarettoman rekursion. search_path lukitaan tyhjaksi, jotta funktiota
-- ei voi ohjata vaaraan skeemaan.
create or replace function public.app_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.users u where u.auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role from public.users u where u.auth_user_id = auth.uid() limit 1;
$$;

-- Onko annettu potilas kirjautuneen laakarin potilas aktiivisen
-- hoitosuhteen kautta. Tama on koko mallin ydin: laakari ei nae
-- potilasta jonka hoitosuhde ei ole aktiivinen.
create or replace function public.is_my_patient(p_patient_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.users d on d.id = e.doctor_id
    where e.patient_id = p_patient_id
      and d.auth_user_id = auth.uid()
      and e.status = 'active'
  );
$$;

-- Naytetaan vain kirjautuneille; anon-avaimella ei paase funktioihin.
revoke all on function public.app_user_id() from anon;
revoke all on function public.app_role() from anon;
revoke all on function public.is_my_patient(text) from anon;
grant execute on function public.app_user_id() to authenticated;
grant execute on function public.app_role() to authenticated;
grant execute on function public.is_my_patient(text) to authenticated;
