-- ============================================================
-- 21_viva_demo_commands.sql
-- Government / State Scheme Eligibility Finder
--
-- ONE ordered script for the evaluation / viva.
-- Run each numbered block on its own in pgAdmin (select + F5).
--
-- Every block that changes data is wrapped in BEGIN ... ROLLBACK,
-- so running this file leaves the database exactly as it was.
-- Run as scheme_user on scheme_finder.
-- ============================================================

SET search_path = public;


-- ============================================================
-- 1. DATABASE OVERVIEW
-- ============================================================

-- All tables with their row counts.
SELECT relname AS table_name, n_live_tup AS approx_rows
FROM pg_stat_user_tables
ORDER BY relname;

-- Show the users with their roles (JOIN).
SELECT u.user_id, u.full_name, u.email, r.role_name, u.is_active
FROM users u
JOIN roles r ON r.role_id = u.role_id
ORDER BY r.role_name, u.full_name;


-- ============================================================
-- 2. CONSTRAINTS: the database rejects invalid data
--    Each statement below must FAIL. Run them one at a time.
-- ============================================================

-- CHECK: CGPA must be between 0 and 10.
BEGIN;
UPDATE user_profiles SET cgpa = 15
WHERE user_id = (SELECT MIN(user_id) FROM user_profiles);
ROLLBACK;

-- UNIQUE: email must be unique.
BEGIN;
INSERT INTO users (role_id, full_name, email, password_hash)
SELECT role_id, 'Duplicate', 'ananya.rao@example.com', 'x'
FROM roles WHERE role_name = 'student';
ROLLBACK;

-- FOREIGN KEY: a profile must belong to an existing user.
BEGIN;
INSERT INTO user_profiles (user_id) VALUES (999999);
ROLLBACK;

-- CHECK across columns: a state scheme must have a state name.
BEGIN;
INSERT INTO schemes (scheme_code, scheme_name, government_level)
VALUES ('BAD01', 'Invalid state scheme', 'state');
ROLLBACK;

-- COMPOSITE FOREIGN KEY (18): gender is a text attribute, not numeric.
BEGIN;
INSERT INTO eligibility_rules (group_id, attribute_name, operator, value_type, numeric_value)
VALUES ((SELECT MIN(group_id) FROM eligibility_rule_groups), 'gender', '>=', 'numeric', 5);
ROLLBACK;

-- List every constraint in the project.
SELECT conrelid::regclass AS table_name, conname, contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, contype, conname;


-- ============================================================
-- 3. CRUD (full demo with cascade checks: 06_crud_operations.sql)
-- ============================================================

BEGIN;

-- CREATE
INSERT INTO schemes (scheme_code, scheme_name, government_level, scheme_status)
VALUES ('VIVA01', 'Viva Demo Scheme', 'national', 'open')
RETURNING scheme_id, scheme_code, scheme_name, scheme_status;

-- READ
SELECT scheme_code, scheme_name, scheme_status
FROM schemes WHERE scheme_code = 'VIVA01';

-- UPDATE
UPDATE schemes SET scheme_status = 'closed', updated_at = CURRENT_TIMESTAMP
WHERE scheme_code = 'VIVA01'
RETURNING scheme_code, scheme_status;

-- DELETE
DELETE FROM schemes WHERE scheme_code = 'VIVA01'
RETURNING scheme_code;

ROLLBACK;


-- ============================================================
-- 4. REQUIRED QUERIES (also in 07_required_queries.sql)
-- ============================================================

-- 4a. JOIN: who applied for which scheme.
SELECT u.full_name, s.scheme_code, s.scheme_name,
       a.current_status, a.eligibility_result
FROM users u
JOIN applications a ON a.user_id = u.user_id
JOIN schemes s      ON s.scheme_id = a.scheme_id
ORDER BY u.full_name, s.scheme_code;

-- 4b. NESTED: students whose family income is below the average.
SELECT u.full_name, p.annual_family_income
FROM users u
JOIN user_profiles p ON p.user_id = u.user_id
WHERE p.annual_family_income <
      (SELECT AVG(annual_family_income) FROM user_profiles)
ORDER BY p.annual_family_income;

-- 4c. CORRELATED: schemes that have at least one application.
SELECT s.scheme_code, s.scheme_name
FROM schemes s
WHERE EXISTS (
    SELECT 1 FROM applications a
    WHERE a.scheme_id = s.scheme_id
)
ORDER BY s.scheme_code;

-- 4d. RECURSIVE: full category hierarchy (CYCLE guards against loops).
WITH RECURSIVE category_tree AS (
    SELECT category_id, category_name, parent_category_id,
           1 AS level, category_name::TEXT AS path
    FROM categories
    WHERE parent_category_id IS NULL
    UNION ALL
    SELECT c.category_id, c.category_name, c.parent_category_id,
           t.level + 1, t.path || ' -> ' || c.category_name
    FROM categories c
    JOIN category_tree t ON c.parent_category_id = t.category_id
) CYCLE category_id SET is_cycle USING visited
SELECT level, path FROM category_tree
WHERE NOT is_cycle
ORDER BY path;


-- ============================================================
-- 5. ADVANCED SQL (defined in 08_advanced_sql.sql)
-- ============================================================

-- 5a. CTE: application statistics per scheme.
WITH stats AS (
    SELECT scheme_id,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE current_status = 'approved') AS approved
    FROM applications
    GROUP BY scheme_id
)
SELECT s.scheme_code, s.scheme_name,
       COALESCE(st.total, 0) AS total_applications,
       COALESCE(st.approved, 0) AS approved
FROM schemes s
LEFT JOIN stats st ON st.scheme_id = s.scheme_id
ORDER BY total_applications DESC, s.scheme_code;

-- 5b. FUNCTION: evaluate one student against every scheme.
SELECT s.scheme_code, s.scheme_name, e.eligibility_status, e.explanation
FROM schemes s
CROSS JOIN LATERAL evaluate_eligibility(
    (SELECT user_id FROM users WHERE email = 'ananya.rao@example.com'),
    s.scheme_id
) e
WHERE s.is_active
ORDER BY e.eligibility_status, s.scheme_code;

-- 5c. PROCEDURE: create an application (checks duplicates, runs the
--     eligibility function, stores the result). Rolled back.
BEGIN;
CALL submit_scheme_application('lakshmi.nayak@example.com', 'N15', 'fresh');

SELECT a.application_id, u.full_name, s.scheme_code,
       a.current_status, a.eligibility_result, a.eligibility_reason
FROM applications a
JOIN users u   ON u.user_id = a.user_id
JOIN schemes s ON s.scheme_id = a.scheme_id
WHERE u.email = 'lakshmi.nayak@example.com' AND s.scheme_code = 'N15';
ROLLBACK;

-- 5d. TRIGGER: a status change writes history automatically,
--     including WHO made the change. Rolled back.
BEGIN;
SELECT set_config('app.current_user_id',
       (SELECT user_id::TEXT FROM users WHERE email = 'officer@schemefinder.example'),
       TRUE);

UPDATE applications SET current_status = 'withdrawn'
WHERE application_id = (SELECT MIN(application_id) FROM applications)
RETURNING application_id, current_status;

SELECT log_id, application_id, old_status, new_status, changed_by, remarks
FROM application_status_log
ORDER BY log_id DESC
LIMIT 1;
ROLLBACK;


-- ============================================================
-- 6. AUTHORIZATION
-- ============================================================

-- 6a. The least-privilege database roles.
SELECT rolname, rolcanlogin, rolsuper
FROM pg_roles
WHERE rolname LIKE 'scheme_%'
ORDER BY rolname;

-- 6b. What each role may do on each table.
SELECT grantee, table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE grantee LIKE 'scheme_%_%'
GROUP BY grantee, table_name
ORDER BY grantee, table_name;

-- 6c. Row-Level Security policies (19_row_level_security.sql).
SELECT tablename, policyname, roles, cmd
FROM pg_policies
ORDER BY tablename, policyname;

-- 6d. RLS in action: the student role sees only its own rows.
BEGIN;
SET LOCAL ROLE scheme_student_app;

SELECT COUNT(*) AS rows_without_login FROM user_profiles;   -- 0 (fail closed)

SELECT set_config('app.current_user_id', '3', TRUE);  -- replace 3 with a real student id
SELECT user_id FROM user_profiles;                    -- only that student
SELECT application_id, user_id FROM applications;     -- only that student
ROLLBACK;

-- 6e. Column privilege: the student role cannot read password hashes.
--     Must FAIL with "permission denied".
BEGIN;
SET LOCAL ROLE scheme_student_app;
SELECT password_hash FROM users;
ROLLBACK;


-- ============================================================
-- 7. VECTOR DATABASE (pgvector)
--    Live semantic search: database/vector/semantic_search.py
--    Read / update / delete demo: database/vector/vector_rud_demo.py
-- ============================================================

SELECT s.scheme_code, s.scheme_name,
       vector_dims(se.embedding) AS dimensions,
       se.model_name
FROM scheme_embeddings se
JOIN schemes s ON s.scheme_id = se.scheme_id
ORDER BY s.scheme_code;

-- Schemes most similar to N04 (cosine distance, <=> operator).
SELECT s.scheme_code, s.scheme_name,
       ROUND((1 - (se.embedding <=> ref.embedding))::NUMERIC, 4) AS similarity
FROM scheme_embeddings se
JOIN schemes s ON s.scheme_id = se.scheme_id
CROSS JOIN (
    SELECT e.embedding
    FROM scheme_embeddings e
    JOIN schemes x ON x.scheme_id = e.scheme_id
    WHERE x.scheme_code = 'N04'
) ref
ORDER BY se.embedding <=> ref.embedding
LIMIT 5;
