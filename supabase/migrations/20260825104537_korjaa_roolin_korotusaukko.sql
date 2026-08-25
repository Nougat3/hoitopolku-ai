-- Testi paljasti, etta potilas pystyi paivittamaan oman rivinsa
-- role-sarakkeen arvoon 'laakari' ja nakemaan sita kautta muiden
-- potilaiden tiedot.
--
-- Syy: sarakekohtainen revoke ei poista taulutason UPDATE-oikeutta.
-- Postgresissa taulutason grant kattaa kaikki sarakkeet, ja
-- sarakekohtainen revoke sen paalle ei rajaa sita.
--
-- Oikea tapa on poistaa taulutason oikeus kokonaan ja antaa
-- tarvittaessa vain yksittaiset sarakkeet takaisin.

revoke update on public.users from authenticated;
revoke update on public.users from anon;

-- Kayttajan omalle riville ei talla hetkella tarvita yhtaan
-- selaimesta muokattavaa saraketta. Rooli, sahkoposti ja
-- auth-liitos muutetaan vain palvelinpuolelta.

-- Policy on nyt tarpeeton, koska oikeutta ei ole lainkaan.
drop policy if exists users_update_own on public.users;
