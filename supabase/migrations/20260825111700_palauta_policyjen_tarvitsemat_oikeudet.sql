-- Edellinen migraatio vei EXECUTE-oikeuden myos authenticated-
-- roolilta, mika katkaisi kaiken paasyn: RLS-policyn lauseke
-- evaluoidaan kutsujan oikeuksin, joten policyssa kutsuttu funktio
-- vaatii kutsujalta EXECUTE-oikeuden.
--
-- Oikea rajaus on siis: authenticated saa kutsua (policyt
-- tarvitsevat), anon ja PUBLIC eivat.
grant execute on function public.app_user_id() to authenticated;
grant execute on function public.app_role() to authenticated;
grant execute on function public.is_my_patient(text) to authenticated;

-- kirjaa_audit jaa ilman oikeuksia: se on trigger-funktio, jota
-- kukaan ei kutsu suoraan. Trigger laukeaa taulun omistajan
-- puolesta eika tarkista kutsujan EXECUTE-oikeutta.

-- Funktiot palauttavat vain kutsujan omat tiedot (oma tunnus, oma
-- rooli, oma hoitosuhde), joten niiden kutsuttavuus kirjautuneelle
-- ei paljasta muiden tietoja.
