-- ============================================================
-- 19_row_level_security.sql
-- Row-Level Security (RLS).
--
-- BEFORE: the student DB role could read EVERY user's row
-- (including password_hash) and read/update EVERY student's
-- profile and application. Only the web code limited it to the
-- signed-in student.
--
-- AFTER: PostgreSQL itself enforces it. For the student role,
-- each query only sees rows where user_id equals the session
-- setting app.current_user_id. The web app sets this setting with
-- set_config(..., true) at the start of every student transaction
-- (web/src/lib/student-db.js -> withStudent).
--
-- If the setting is missing, the helper returns NULL and the
-- student sees NOTHING (fail closed).
--
-- Run AFTER 13_student_application_permissions.sql, as scheme_user.
-- Safe to rerun. The table owner (scheme_user) is not affected,
-- so pgAdmin queries and the Python scripts keep working.
-- ============================================================

BEGIN;
SET LOCAL search_path = public;

-- ------------------------------------------------------------
-- Helper: the authenticated application user for this transaction.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::BIGINT
$$;


-- ============================================================
-- 1. Column-level privileges on USERS
--    Nobody except the auth role needs password_hash. These are
--    granted in 12_student_eligibility_permissions.sql
--    (student: user_id, email) and 16_admin_permissions.sql
--    (admin: everything except password_hash).
-- ============================================================


-- ============================================================
-- 2. USERS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_auth_read    ON users;
DROP POLICY IF EXISTS users_admin_read   ON users;
DROP POLICY IF EXISTS users_officer_read ON users;
DROP POLICY IF EXISTS users_student_own  ON users;

-- Login must find any account by email.
CREATE POLICY users_auth_read ON users
    FOR SELECT TO scheme_auth_reader
    USING (TRUE);

CREATE POLICY users_admin_read ON users
    FOR SELECT TO scheme_admin_app
    USING (TRUE);

-- Officers need applicant names.
CREATE POLICY users_officer_read ON users
    FOR SELECT TO scheme_officer_app
    USING (TRUE);

CREATE POLICY users_student_own ON users
    FOR SELECT TO scheme_student_app
    USING (user_id = app_current_user_id());

-- Self-registration can only ever create a STUDENT account (role_id 2),
-- even if the web code had a bug.
DROP POLICY IF EXISTS users_auth_register_student ON users;

CREATE POLICY users_auth_register_student ON users
    FOR INSERT TO scheme_auth_reader
    WITH CHECK (role_id = 2);

-- The admin role may delete student and officer accounts, never an
-- admin account (role_id 1).
DROP POLICY IF EXISTS users_admin_delete ON users;

CREATE POLICY users_admin_delete ON users
    FOR DELETE TO scheme_admin_app
    USING (role_id <> 1);


-- ============================================================
-- 3. USER_PROFILES
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_student_own ON user_profiles;
DROP POLICY IF EXISTS profiles_admin_read  ON user_profiles;

-- USING limits which rows can be read/updated;
-- WITH CHECK stops a student writing a row for another user_id.
CREATE POLICY profiles_student_own ON user_profiles
    FOR ALL TO scheme_student_app
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

CREATE POLICY profiles_admin_read ON user_profiles
    FOR SELECT TO scheme_admin_app
    USING (TRUE);


-- ============================================================
-- 4. APPLICATIONS
-- ============================================================

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_student_own     ON applications;
DROP POLICY IF EXISTS applications_officer_read    ON applications;
DROP POLICY IF EXISTS applications_officer_update  ON applications;
DROP POLICY IF EXISTS applications_admin_read      ON applications;

CREATE POLICY applications_student_own ON applications
    FOR ALL TO scheme_student_app
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

CREATE POLICY applications_officer_read ON applications
    FOR SELECT TO scheme_officer_app
    USING (TRUE);

-- Column grants (14_officer_permissions.sql) already limit officers
-- to current_status / updated_at.
CREATE POLICY applications_officer_update ON applications
    FOR UPDATE TO scheme_officer_app
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY applications_admin_read ON applications
    FOR SELECT TO scheme_admin_app
    USING (TRUE);

-- A student may delete only their OWN applications (policy above)
-- AND only while they are still drafts. A RESTRICTIVE policy is ANDed
-- with the permissive ones, so submitted / approved / rejected
-- applications can never be deleted by the student role.
DROP POLICY IF EXISTS applications_student_delete_draft_only ON applications;

CREATE POLICY applications_student_delete_draft_only ON applications
    AS RESTRICTIVE
    FOR DELETE TO scheme_student_app
    USING (current_status = 'draft');


-- ============================================================
-- 5. APPLICATION_STATUS_LOG
--    A student may only see / create history for their OWN
--    applications. The subquery on applications is itself
--    filtered by the student's applications policy.
-- ============================================================

ALTER TABLE application_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS status_log_student_read    ON application_status_log;
DROP POLICY IF EXISTS status_log_student_insert  ON application_status_log;
DROP POLICY IF EXISTS status_log_officer_read    ON application_status_log;
DROP POLICY IF EXISTS status_log_officer_insert  ON application_status_log;
DROP POLICY IF EXISTS status_log_admin_read      ON application_status_log;

CREATE POLICY status_log_student_read ON application_status_log
    FOR SELECT TO scheme_student_app
    USING (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.application_id = application_status_log.application_id
        )
    );

-- The status trigger runs as the student when they submit.
CREATE POLICY status_log_student_insert ON application_status_log
    FOR INSERT TO scheme_student_app
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.application_id = application_status_log.application_id
        )
    );

CREATE POLICY status_log_officer_read ON application_status_log
    FOR SELECT TO scheme_officer_app
    USING (TRUE);

CREATE POLICY status_log_officer_insert ON application_status_log
    FOR INSERT TO scheme_officer_app
    WITH CHECK (TRUE);

CREATE POLICY status_log_admin_read ON application_status_log
    FOR SELECT TO scheme_admin_app
    USING (TRUE);

COMMIT;


-- ============================================================
-- VIVA DEMO (run in pgAdmin as scheme_user)
-- ============================================================
--
-- BEGIN;
-- SET LOCAL ROLE scheme_student_app;
--
-- -- No user set: the student sees nothing (fail closed).
-- SELECT COUNT(*) FROM user_profiles;
--
-- -- Act as one student. First look up an id as scheme_user, e.g.
-- --   SELECT user_id FROM users WHERE email = 'ananya.rao@example.com';
-- SELECT set_config('app.current_user_id', '3', TRUE);   -- use that id
-- SELECT user_id FROM user_profiles;
-- SELECT application_id, user_id FROM applications;
--
-- -- password_hash is not visible at all (column privilege):
-- SELECT password_hash FROM users;      -- ERROR: permission denied
-- ROLLBACK;
--
-- Show the policies:
-- SELECT tablename, policyname, roles, cmd FROM pg_policies ORDER BY tablename;
