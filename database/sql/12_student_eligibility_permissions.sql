-- ============================================================
-- 12_student_eligibility_permissions.sql
-- Permissions required for student eligibility evaluation
-- ============================================================

BEGIN;

-- Tables read internally by evaluate_eligibility()
-- users: only the columns the function/procedure need (never password_hash).
GRANT SELECT (user_id, email) ON users TO scheme_student_app;

GRANT SELECT ON TABLE
    user_profiles,
    schemes,
    eligibility_rule_groups,
    eligibility_rules,
    applications
TO scheme_student_app;

-- Allow the student backend DB role to execute the existing function
GRANT EXECUTE
ON FUNCTION evaluate_eligibility(BIGINT, BIGINT)
TO scheme_student_app;

COMMIT;