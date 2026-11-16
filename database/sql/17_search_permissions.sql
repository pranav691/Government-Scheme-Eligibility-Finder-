-- ============================================================
-- 17_search_permissions.sql
-- Allow the public catalogue role to run semantic (vector) search.
--
-- The website's /api/search route uses the catalogue connection
-- (DB_USER in web/.env.local). That role can already read the
-- scheme catalogue (09_catalogue_permissions.sql); it now also
-- needs READ-ONLY access to the stored scheme embeddings.
--
-- No INSERT / UPDATE / DELETE is granted: website users can search
-- vectors but can never modify them.
-- ============================================================

BEGIN;

GRANT SELECT ON TABLE public.scheme_embeddings
TO scheme_catalogue_reader;

COMMIT;

-- Verify:
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'scheme_embeddings';
