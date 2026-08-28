-- Paasy potilaan tietoihin vain aktiivisella jakokoodi-istunnolla.
--
-- Aiemmin private.is_my_patient hyvaksyi myos aktiivisen enrollment-rivin,
-- jolloin laakarilla oli pysyva lukuoikeus potilaaseen ilman koodia.
-- Tuotelupaus on toinen: potilas paattaa jakokoodilla kuka nakee tiedot.
-- Enrollment jaa edelleen "oma laakarisi" -suhteeksi potilaan omassa
-- nakymassa, mutta se ei enaa avaa potilasdataa laakarille.

create or replace function private.is_my_patient(p_patient_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.care_sessions cs
    where cs.patient_id = p_patient_id
      and cs.doctor_id = private.app_user_id()
      and cs.ended_at is null
      and cs.expires_at > now()
  );
$$;

comment on function private.is_my_patient(text) is
  'Tosi vain kun laakarilla on aktiivinen care_session potilaaseen (jakokoodi lunastettu).';

-- Demosisalto: kaksi mallipotilasta laakarin listalle, jotta priorisointi ja
-- triage nakyvat demossa ilman erillista koodin lunastusta.
insert into public.care_sessions (patient_id, doctor_id, expires_at)
select p.patient_id, 'usr_laakari_demo', now() + interval '365 days'
from (values ('usr_potilas_kolmas'), ('usr_potilas_neljas')) as p(patient_id)
where exists (select 1 from public.users u where u.id = p.patient_id)
  and not exists (
    select 1 from public.care_sessions cs
    where cs.patient_id = p.patient_id
      and cs.doctor_id = 'usr_laakari_demo'
      and cs.ended_at is null
      and cs.expires_at > now() + interval '30 days'
  );
