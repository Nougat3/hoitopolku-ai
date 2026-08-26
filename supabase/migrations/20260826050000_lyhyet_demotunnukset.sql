-- Lyhyet demotunnukset kirjautumiseen.
-- Potilas: p@demo.fi / demo12
-- Laakari: l@demo.fi / demo12
--
-- Huom: encrypted_password paivitetaan ymparistossa execute_sql:lla
-- (crypt), koska migraatiotiedosto ei saa sisaltaa salasanoja.

update public.users
set email = 'p@demo.fi'
where id = 'usr_potilas_demo'
  and email = 'potilas@demo.hoitopolku.ai';

update public.users
set email = 'l@demo.fi'
where id = 'usr_laakari_demo'
  and email = 'laakari@demo.hoitopolku.ai';
