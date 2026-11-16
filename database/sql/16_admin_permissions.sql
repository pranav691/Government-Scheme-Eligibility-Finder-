-- ============================================================
-- 16_admin_permissions.sql
-- Restricted DB role used by admin backend APIs
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'scheme_admin_app'
    ) THEN
        CREATE ROLE scheme_admin_app
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    ELSE
        ALTER ROLE scheme_admin_app
            WITH LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE scheme_finder
TO scheme_admin_app;

GRANT USAGE ON SCHEMA public
TO scheme_admin_app;

-- Admin can view users and their roles.
GRANT SELECT ON TABLE
    users,
    roles,
    user_profiles
TO scheme_admin_app;

-- Admin can manage the scheme catalogue.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    schemes,
    eligibility_rule_groups,
    eligibility_rules,
    categories,
    scheme_categories,
    scheme_documents
TO scheme_admin_app;

-- Admin can inspect applications and status history.
GRANT SELECT ON TABLE
    applications,
    application_status_log
TO scheme_admin_app;

-- Admin can inspect vector records.
GRANT SELECT ON TABLE
    scheme_embeddings
TO scheme_admin_app;

-- Needed for INSERT operations on identity columns.
GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO scheme_admin_app;

COMMIT;