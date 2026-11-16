-- ============================================================
-- 07_required_queries.sql
-- Government / State Scheme Eligibility Finder
--
-- Rubric #7:
-- 1. JOIN query
-- 2. Nested query
-- 3. Correlated query
-- 4. Recursive query
--
-- All queries operate on the actual populated project data.
-- They are READ ONLY and do not modify any records.
-- ============================================================

SET search_path = public;


-- ============================================================
-- QUERY 1: JOIN QUERY
-- ============================================================
-- Purpose:
-- Show which student applied for which government scheme,
-- along with application status and eligibility result.
--
-- Tables used:
-- users
-- applications
-- schemes
-- ============================================================

SELECT
    u.user_id,
    u.full_name,
    u.email,
    s.scheme_code,
    s.scheme_name,
    a.current_status,
    a.eligibility_result,
    a.applied_at
FROM users u
JOIN applications a
    ON u.user_id = a.user_id
JOIN schemes s
    ON a.scheme_id = s.scheme_id
ORDER BY u.full_name, s.scheme_code;


-- ============================================================
-- QUERY 2: NESTED QUERY / SUBQUERY
-- ============================================================
-- Purpose:
-- Find students whose annual family income is below
-- the average family income of all student profiles.
--
-- Inner query:
-- Calculates average family income.
--
-- Outer query:
-- Finds students below that calculated average.
-- ============================================================

SELECT
    u.full_name,
    u.email,
    p.annual_family_income
FROM users u
JOIN user_profiles p
    ON u.user_id = p.user_id
WHERE p.annual_family_income <
(
    SELECT AVG(annual_family_income)
    FROM user_profiles
    WHERE annual_family_income IS NOT NULL
)
ORDER BY p.annual_family_income;


-- Optional helper query:
-- Use this during the viva to show the calculated average.

SELECT
    ROUND(AVG(annual_family_income), 2)
        AS average_family_income
FROM user_profiles
WHERE annual_family_income IS NOT NULL;


-- ============================================================
-- QUERY 3: CORRELATED SUBQUERY
-- ============================================================
-- Purpose:
-- Find government schemes that have at least
-- one application in our database.
--
-- This is CORRELATED because the inner query refers to:
--
--      s.scheme_id
--
-- from the outer query.
-- ============================================================

SELECT
    s.scheme_code,
    s.scheme_name,
    s.government_level,
    s.scheme_type
FROM schemes s
WHERE EXISTS
(
    SELECT 1
    FROM applications a
    WHERE a.scheme_id = s.scheme_id
)
ORDER BY s.scheme_code;


-- ============================================================
-- QUERY 4: RECURSIVE QUERY
-- ============================================================
-- Purpose:
-- Display the complete parent-child category hierarchy.
--
-- Example:
--
-- Education
-- Education -> Scholarships
-- Education -> Technical Education
-- Education -> Fellowships & Research
--
-- This uses the self-referencing:
-- categories.parent_category_id
-- ============================================================

WITH RECURSIVE category_tree AS
(
    -- BASE CASE
    -- Select root categories which do not have a parent.

    SELECT
        category_id,
        category_name,
        parent_category_id,
        1 AS level,
        category_name::TEXT AS category_path
    FROM categories
    WHERE parent_category_id IS NULL


    UNION ALL


    -- RECURSIVE CASE
    -- Find children belonging to categories
    -- already found in category_tree.

    SELECT
        c.category_id,
        c.category_name,
        c.parent_category_id,
        ct.level + 1 AS level,
        (
            ct.category_path
            || ' -> '
            || c.category_name
        )::TEXT AS category_path
    FROM categories c
    JOIN category_tree ct
        ON c.parent_category_id = ct.category_id
)

SELECT
    category_id,
    category_name,
    parent_category_id,
    level,
    category_path
FROM category_tree
ORDER BY category_path;


-- ============================================================
-- BONUS JOIN QUERY
-- ============================================================
-- Purpose:
-- Show schemes together with their assigned categories.
--
-- Tables:
-- schemes
-- scheme_categories
-- categories
-- ============================================================

SELECT
    s.scheme_code,
    s.scheme_name,
    c.category_name
FROM schemes s
JOIN scheme_categories sc
    ON s.scheme_id = sc.scheme_id
JOIN categories c
    ON sc.category_id = c.category_id
ORDER BY s.scheme_code, c.category_name;