-- ============================================================
-- 14_officer_permissions.sql
-- Restricted DB role used by officer backend APIs
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'scheme_officer_app'
    ) THEN
        CREATE ROLE scheme_officer_app
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    ELSE
        ALTER ROLE scheme_officer_app
            WITH LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE scheme_finder
TO scheme_officer_app;

GRANT USAGE ON SCHEMA public
TO scheme_officer_app;

-- Officer must view applications
GRANT SELECT
ON TABLE applications
TO scheme_officer_app;

-- Officer must view scheme information
GRANT SELECT
ON TABLE schemes
TO scheme_officer_app;

-- Needed to identify applicant
GRANT SELECT (
    user_id,
    full_name,
    email
)
ON users
TO scheme_officer_app;

-- Officer can see status history
GRANT SELECT, INSERT
ON TABLE application_status_log
TO scheme_officer_app;

GRANT USAGE, SELECT
ON SEQUENCE application_status_log_log_id_seq
TO scheme_officer_app;

-- Officer may update only status-related application fields
GRANT UPDATE (
    current_status,
    updated_at
)
ON applications
TO scheme_officer_app;

COMMIT;