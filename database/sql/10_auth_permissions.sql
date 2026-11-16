-- ============================================================
-- 10_auth_permissions.sql
-- Restricted DB login used only for authentication
-- ============================================================

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'scheme_auth_reader'
    ) THEN

        CREATE ROLE scheme_auth_reader
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;

    ELSE

        ALTER ROLE scheme_auth_reader
            WITH LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;

    END IF;
END
$$;


GRANT CONNECT ON DATABASE scheme_finder
TO scheme_auth_reader;


GRANT USAGE ON SCHEMA public
TO scheme_auth_reader;


-- Remove any accidental broader access first.
REVOKE ALL ON TABLE users, roles
FROM scheme_auth_reader;


-- Authentication needs only these USER columns.
GRANT SELECT (
    user_id,
    role_id,
    full_name,
    email,
    password_hash,
    is_active
)
ON users
TO scheme_auth_reader;


-- Needed to determine student/officer/admin role.
GRANT SELECT (
    role_id,
    role_name
)
ON roles
TO scheme_auth_reader;


COMMIT;