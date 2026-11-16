-- ============================================================
-- 11_student_profile_permissions.sql
-- Restricted DB login for authenticated student operations
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'scheme_student_app'
    ) THEN
        CREATE ROLE scheme_student_app
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    ELSE
        ALTER ROLE scheme_student_app
            WITH LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE scheme_finder
TO scheme_student_app;

GRANT USAGE ON SCHEMA public
TO scheme_student_app;

GRANT SELECT, INSERT, UPDATE
ON TABLE user_profiles
TO scheme_student_app;

COMMIT;