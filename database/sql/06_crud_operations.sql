-- ============================================================
-- 06_crud_operations.sql
-- Government / State Scheme Eligibility Finder
--
-- Demonstrates:
-- C = INSERT
-- R = SELECT
-- U = UPDATE
-- D = DELETE
--
-- Uses DEMO01 only.
-- Does NOT modify the 25 real schemes.
-- ============================================================

BEGIN;

SET LOCAL search_path = public;

-- ============================================================
-- CLEANUP
-- Makes this script safe to rerun.
-- ============================================================

DELETE FROM schemes
WHERE scheme_code = 'DEMO01';


-- ============================================================
-- 1. CREATE / INSERT
-- ============================================================

INSERT INTO schemes (
    scheme_code,
    scheme_name,
    government_level,
    state_name,
    department,
    scheme_type,
    description,
    benefit_summary,
    application_mode,
    application_url,
    source_url,
    academic_year,
    scheme_status,
    verification_status,
    is_active
)
VALUES (
    'DEMO01',
    'Demo Student Support Scheme',
    'national',
    NULL,
    'Demo Department',
    'Scholarship',
    'Temporary scheme created only for demonstrating CRUD operations.',
    'Demo benefit of Rs. 10,000 per year.',
    'online',
    NULL,
    NULL,
    '2026-27',
    'open',
    'unverified',
    TRUE
)
RETURNING
    scheme_id,
    scheme_code,
    scheme_name,
    scheme_status;


-- ============================================================
-- Insert an eligibility rule group for DEMO01
-- ============================================================

INSERT INTO eligibility_rule_groups (
    scheme_id,
    group_name,
    group_order,
    is_active
)
SELECT
    scheme_id,
    'Standard eligibility',
    1,
    TRUE
FROM schemes
WHERE scheme_code = 'DEMO01'
RETURNING group_id, scheme_id, group_name;


-- ============================================================
-- Insert eligibility rules
-- Rule 1: income <= 500000
-- Rule 2: currently studying = true
-- ============================================================

INSERT INTO eligibility_rules (
    group_id,
    attribute_name,
    operator,
    value_type,
    numeric_value,
    text_value,
    boolean_value,
    failure_message
)
SELECT
    g.group_id,
    'annual_family_income',
    '<=',
    'numeric',
    500000,
    NULL,
    NULL,
    'Annual family income must not exceed Rs. 5,00,000.'
FROM eligibility_rule_groups g
JOIN schemes s
    ON g.scheme_id = s.scheme_id
WHERE s.scheme_code = 'DEMO01'
  AND g.group_order = 1;


INSERT INTO eligibility_rules (
    group_id,
    attribute_name,
    operator,
    value_type,
    numeric_value,
    text_value,
    boolean_value,
    failure_message
)
SELECT
    g.group_id,
    'currently_studying',
    '=',
    'boolean',
    NULL,
    NULL,
    TRUE,
    'Applicant must currently be studying.'
FROM eligibility_rule_groups g
JOIN schemes s
    ON g.scheme_id = s.scheme_id
WHERE s.scheme_code = 'DEMO01'
  AND g.group_order = 1;


-- ============================================================
-- Insert one required document
-- ============================================================

INSERT INTO scheme_documents (
    scheme_id,
    document_name,
    is_mandatory,
    notes
)
SELECT
    scheme_id,
    'Income Certificate',
    TRUE,
    'Demo document used for CRUD demonstration.'
FROM schemes
WHERE scheme_code = 'DEMO01';


-- ============================================================
-- 2. READ / SELECT
-- ============================================================

-- Show the demo scheme

SELECT
    scheme_id,
    scheme_code,
    scheme_name,
    department,
    benefit_summary,
    scheme_status,
    verification_status
FROM schemes
WHERE scheme_code = 'DEMO01';


-- Show DEMO01 with its eligibility rules

SELECT
    s.scheme_code,
    s.scheme_name,
    g.group_name,
    r.attribute_name,
    r.operator,
    r.numeric_value,
    r.text_value,
    r.boolean_value,
    r.failure_message
FROM schemes s
JOIN eligibility_rule_groups g
    ON s.scheme_id = g.scheme_id
JOIN eligibility_rules r
    ON g.group_id = r.group_id
WHERE s.scheme_code = 'DEMO01'
ORDER BY r.rule_id;


-- Show its required documents

SELECT
    s.scheme_code,
    d.document_name,
    d.is_mandatory,
    d.notes
FROM schemes s
JOIN scheme_documents d
    ON s.scheme_id = d.scheme_id
WHERE s.scheme_code = 'DEMO01';


-- ============================================================
-- 3. UPDATE
-- ============================================================

UPDATE schemes
SET
    benefit_summary =
        'Updated demo benefit of Rs. 15,000 per year.',
    scheme_status = 'closed',
    updated_at = CURRENT_TIMESTAMP
WHERE scheme_code = 'DEMO01'
RETURNING
    scheme_code,
    scheme_name,
    benefit_summary,
    scheme_status,
    updated_at;


-- ============================================================
-- Update one eligibility rule
--
-- Change income limit:
-- Rs. 5,00,000 -> Rs. 6,00,000
-- ============================================================

UPDATE eligibility_rules r
SET
    numeric_value = 600000,
    failure_message =
        'Annual family income must not exceed Rs. 6,00,000.'
FROM eligibility_rule_groups g
JOIN schemes s
    ON g.scheme_id = s.scheme_id
WHERE r.group_id = g.group_id
  AND s.scheme_code = 'DEMO01'
  AND r.attribute_name = 'annual_family_income'
RETURNING
    r.rule_id,
    r.attribute_name,
    r.operator,
    r.numeric_value,
    r.failure_message;


-- ============================================================
-- READ AGAIN
-- Proves that UPDATE worked
-- ============================================================

SELECT
    scheme_code,
    scheme_name,
    benefit_summary,
    scheme_status
FROM schemes
WHERE scheme_code = 'DEMO01';


SELECT
    s.scheme_code,
    r.attribute_name,
    r.operator,
    r.numeric_value,
    r.boolean_value
FROM eligibility_rules r
JOIN eligibility_rule_groups g
    ON r.group_id = g.group_id
JOIN schemes s
    ON g.scheme_id = s.scheme_id
WHERE s.scheme_code = 'DEMO01';


-- ============================================================
-- 4. DELETE
-- ============================================================

DELETE FROM schemes
WHERE scheme_code = 'DEMO01'
RETURNING
    scheme_id,
    scheme_code,
    scheme_name;


-- ============================================================
-- VERIFY DELETE
-- Should return 0 rows
-- ============================================================

SELECT *
FROM schemes
WHERE scheme_code = 'DEMO01';


-- ============================================================
-- VERIFY CASCADE DELETE
--
-- Since eligibility_rule_groups and scheme_documents use
-- ON DELETE CASCADE, their DEMO01-related records should also
-- disappear automatically.
-- ============================================================

SELECT g.*
FROM eligibility_rule_groups g
JOIN schemes s
    ON g.scheme_id = s.scheme_id
WHERE s.scheme_code = 'DEMO01';


SELECT d.*
FROM scheme_documents d
JOIN schemes s
    ON d.scheme_id = s.scheme_id
WHERE s.scheme_code = 'DEMO01';


COMMIT;