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

-- Column-level privileges: the student role may NOT edit user_id,
-- scheme_id, application_kind, previous_award_verified or
-- attendance_percentage (officer-verified evidence), nor create an
-- application that is already approved.
-- (Revoke first so this script is safe to re-run on an older database.)
REVOKE INSERT, UPDATE ON TABLE applications FROM scheme_student_app;

GRANT SELECT
ON TABLE applications
TO scheme_student_app;

-- Create a draft (the submit_scheme_application procedure).
GRANT INSERT (
    user_id, scheme_id, current_status, application_kind,
    created_at, updated_at
) ON applications TO scheme_student_app;

-- Submit a draft and store the eligibility result.
GRANT UPDATE (
    current_status, applied_at,
    eligibility_result, eligibility_reason, eligibility_checked_at,
    updated_at
) ON applications TO scheme_student_app;

-- Delete a draft ("Delete Draft" button). Row-Level Security
-- (19_row_level_security.sql) limits this to the student's OWN
-- applications that are still drafts.
GRANT DELETE
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
