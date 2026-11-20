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

-- Admin can view users and their roles, but never password_hash.
-- (Revoke first so this script is safe to re-run on an older database.)
REVOKE SELECT ON TABLE users FROM scheme_admin_app;

GRANT SELECT (user_id, role_id, full_name, email, is_active, created_at)
ON users TO scheme_admin_app;

GRANT SELECT ON TABLE
    roles,
    user_profiles
TO scheme_admin_app;

-- Admin can delete a user (Admin > Users > Delete). Row-Level Security
-- (19_row_level_security.sql) refuses to delete admin accounts, and the
-- foreign keys refuse users who still have applications.
GRANT DELETE ON TABLE users TO scheme_admin_app;

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

-- Admin can inspect vector records and refresh them when a scheme
-- is created or edited in the admin screens.
GRANT SELECT, INSERT, UPDATE ON TABLE
    scheme_embeddings
TO scheme_admin_app;

-- Needed for INSERT operations on identity columns.
GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO scheme_admin_app;

COMMIT;