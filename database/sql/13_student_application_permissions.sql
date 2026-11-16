-- ============================================================
-- 13_student_application_permissions.sql
-- Privileges the student backend role needs to create, view and
-- submit its own applications.
--
-- (This file previously contained a SELECT query by mistake, so a
-- fresh database built from these scripts could not create
-- applications from the website.)
--
-- Run after 12_student_eligibility_permissions.sql, as scheme_user.
-- Safe to rerun: GRANT is idempotent.
--
-- Which ROWS the student may touch is enforced separately by
-- Row-Level Security in 19_row_level_security.sql.
-- ============================================================

BEGIN;

-- Create a draft (procedure), read own applications, update status
-- and stored eligibility result when submitting.
GRANT SELECT, INSERT, UPDATE
ON TABLE applications
TO scheme_student_app;

-- Read own status history; the status trigger inserts a row
-- (as the student) when a draft is submitted.
GRANT SELECT, INSERT
ON TABLE application_status_log
TO scheme_student_app;

-- Identity columns used by the inserts above.
GRANT USAGE, SELECT
ON SEQUENCE applications_application_id_seq,
            application_status_log_log_id_seq,
            user_profiles_profile_id_seq
TO scheme_student_app;

-- The application-creation stored procedure.
GRANT EXECUTE
ON PROCEDURE submit_scheme_application(TEXT, TEXT, TEXT)
TO scheme_student_app;

COMMIT;
