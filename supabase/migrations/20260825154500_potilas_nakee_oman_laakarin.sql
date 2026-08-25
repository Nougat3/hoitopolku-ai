-- Potilaalle nayetetaan hoitavan laakarin nimi ja nimike. Ilman tata
-- policya users-rivin luku epaonnistuu ja laakarin kortti jaa tyhjaksi.
-- Funktio on security definer samasta syysta kuin muut apufunktiot:
-- policyn sisalta ei voi luottaa kutsujan omiin lukuoikeuksiin.
create or replace function public.is_my_doctor(kohde text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.doctor_id = kohde
      and e.patient_id = public.app_user_id()
      and e.status = 'active'
  );
$$;

revoke all on function public.is_my_doctor(text) from public, anon;
grant execute on function public.is_my_doctor(text) to authenticated;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.is_my_patient(id)
    or public.is_my_doctor(id)
  );
