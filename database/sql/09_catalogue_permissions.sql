BEGIN;

-- Use a dedicated role for the two public catalogue APIs.
CREATE ROLE scheme_catalogue_reader NOLOGIN;

GRANT CONNECT ON DATABASE scheme_finder TO scheme_catalogue_reader;
GRANT USAGE ON SCHEMA public TO scheme_catalogue_reader;
GRANT SELECT ON TABLE
    public.schemes,
    public.scheme_categories,
    public.categories,
    public.scheme_documents,
    public.eligibility_rule_groups,
    public.eligibility_rules
TO scheme_catalogue_reader;

COMMIT;

-- In psql, set the password with \password scheme_catalogue_reader,
-- then run ALTER ROLE scheme_catalogue_reader LOGIN;
