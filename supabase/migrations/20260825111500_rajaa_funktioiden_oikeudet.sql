-- Postgres antaa funktioille oletuksena EXECUTE-oikeuden PUBLIC-
-- roolille. Aiempi "revoke ... from anon" ei siksi purrut: anon peri
-- oikeuden PUBLICin kautta. Sama virheluokka kuin roolin
-- korotusaukossa: revoke ei auta jos oikeus tulee muualta.
revoke all on function public.app_user_id() from public;
revoke all on function public.app_role() from public;
revoke all on function public.is_my_patient(text) from public;
revoke all on function public.kirjaa_audit() from public;

-- Trigger-funktio ei kuulu REST-rajapinnan pintaan lainkaan.
-- Trigger laukeaa silti, koska triggerin suoritus ei tarkista
-- kutsujan EXECUTE-oikeutta.
revoke all on function public.kirjaa_audit() from anon;
revoke all on function public.kirjaa_audit() from authenticated;

revoke all on function public.app_user_id() from anon;
revoke all on function public.app_role() from anon;
revoke all on function public.is_my_patient(text) from anon;

-- HUOM: seuraavat kolme rivia vievat oikeuden myos authenticated-
-- roolilta, mika katkaisee kaiken paasyn. Korjaus on seuraavassa
-- migraatiossa. Rivit on jatetty tahan, koska ne on jo ajettu.
revoke all on function public.app_user_id() from authenticated;
revoke all on function public.app_role() from authenticated;
revoke all on function public.is_my_patient(text) from authenticated;
