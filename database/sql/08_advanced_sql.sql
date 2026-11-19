-- ============================================================
-- 08_advanced_sql.sql
-- Government / State Scheme Eligibility Finder
--
-- RUBRIC #8 - ADVANCED SQL
--
-- 1. CTE
-- 2. FUNCTION     -> evaluate_eligibility()
-- 3. PROCEDURE    -> submit_scheme_application()
-- 4. TRIGGER      -> automatic application status history
--
-- ============================================================

SET search_path = public;


-- ============================================================
-- PART 1: NORMAL CTE
-- ============================================================
-- PURPOSE:
-- Generate application statistics for every scheme.
--
-- The CTE first calculates application counts.
-- The outer query then joins those statistics with schemes.
-- ============================================================

WITH application_statistics AS
(
    SELECT
        scheme_id,
        COUNT(*) AS total_applications,
        COUNT(*) FILTER (
            WHERE current_status = 'approved'
        ) AS approved_applications,
        COUNT(*) FILTER (
            WHERE current_status = 'submitted'
        ) AS submitted_applications,
        COUNT(*) FILTER (
            WHERE current_status = 'under_review'
        ) AS under_review_applications
    FROM applications
    GROUP BY scheme_id
)

SELECT
    s.scheme_code,
    s.scheme_name,

    COALESCE(a.total_applications, 0)
        AS total_applications,

    COALESCE(a.approved_applications, 0)
        AS approved_applications,

    COALESCE(a.submitted_applications, 0)
        AS submitted_applications,

    COALESCE(a.under_review_applications, 0)
        AS under_review_applications

FROM schemes s

LEFT JOIN application_statistics a
    ON s.scheme_id = a.scheme_id

ORDER BY
    total_applications DESC,
    s.scheme_code;



-- ============================================================
-- PART 2: ELIGIBILITY FUNCTION
-- ============================================================
--
-- FUNCTION:
-- evaluate_eligibility(user_id, scheme_id)
--
-- PURPOSE:
-- Evaluate a user's profile against the eligibility rules
-- stored in:
--
-- eligibility_rule_groups
-- eligibility_rules
--
-- IMPORTANT:
--
-- Rules within one group = AND
-- Different groups         = OR
--
-- The function can read:
--
-- 1. user_profiles attributes
-- 2. applications attributes
-- 3. derived age
--
-- Possible output:
--
-- eligible
-- ineligible
-- needs_review
--
-- ============================================================

CREATE OR REPLACE FUNCTION evaluate_eligibility(
    p_user_id BIGINT,
    p_scheme_id BIGINT
)
RETURNS TABLE (
    eligibility_status TEXT,
    explanation TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE

    v_profile JSONB;
    v_application JSONB;

    v_rules_complete BOOLEAN;

    v_group RECORD;
    v_rule RECORD;

    v_group_pass BOOLEAN;
    v_rule_pass BOOLEAN;

    v_group_missing BOOLEAN;

    v_any_group_pass BOOLEAN := FALSE;
    v_missing_evidence BOOLEAN := FALSE;

    v_has_groups BOOLEAN := FALSE;

    v_value TEXT;

    v_first_failure TEXT := NULL;

    v_date_of_birth DATE;
    v_age INTEGER;

BEGIN

    -- --------------------------------------------------------
    -- Verify that the user exists.
    -- --------------------------------------------------------

    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE user_id = p_user_id
    ) THEN

        RETURN QUERY
        SELECT
            'needs_review'::TEXT,
            'User does not exist.'::TEXT;

        RETURN;

    END IF;


    -- --------------------------------------------------------
    -- Get the user's profile as JSON.
    --
    -- JSON lets us dynamically access columns using the
    -- attribute_name stored in eligibility_rules.
    -- --------------------------------------------------------

    SELECT to_jsonb(p)
    INTO v_profile
    FROM user_profiles p
    WHERE p.user_id = p_user_id;


    IF v_profile IS NULL THEN

        RETURN QUERY
        SELECT
            'needs_review'::TEXT,
            'User profile is missing.'::TEXT;

        RETURN;

    END IF;


    -- --------------------------------------------------------
    -- Verify scheme and read whether the complete official
    -- eligibility rule set has been verified.
    -- --------------------------------------------------------

    SELECT eligibility_rules_complete
    INTO v_rules_complete
    FROM schemes
    WHERE scheme_id = p_scheme_id;


    IF NOT FOUND THEN

        RETURN QUERY
        SELECT
            'needs_review'::TEXT,
            'Scheme does not exist.'::TEXT;

        RETURN;

    END IF;


    -- --------------------------------------------------------
    -- Retrieve an existing application if one exists.
    --
    -- This is required for application-specific conditions:
    --
    -- application_kind
    -- previous_award_verified
    -- attendance_percentage
    -- --------------------------------------------------------

    SELECT to_jsonb(a)
    INTO v_application
    FROM applications a
    WHERE a.user_id = p_user_id
      AND a.scheme_id = p_scheme_id
    LIMIT 1;


    -- --------------------------------------------------------
    -- Calculate derived AGE.
    --
    -- Age is NOT stored in USER_PROFILES.
    -- It is derived from date_of_birth.
    -- --------------------------------------------------------

    v_date_of_birth :=
        NULLIF(v_profile ->> 'date_of_birth', '')::DATE;


    IF v_date_of_birth IS NOT NULL THEN

        v_age :=
            EXTRACT(
                YEAR FROM AGE(CURRENT_DATE, v_date_of_birth)
            )::INTEGER;

    END IF;


    -- ========================================================
    -- PROCESS EACH ELIGIBILITY RULE GROUP
    -- ========================================================

    FOR v_group IN

        SELECT
            group_id,
            group_name,
            group_order

        FROM eligibility_rule_groups

        WHERE scheme_id = p_scheme_id
          AND is_active = TRUE

        ORDER BY group_order

    LOOP

        v_has_groups := TRUE;

        -- Every rule in one group must pass.
        v_group_pass := TRUE;

        v_group_missing := FALSE;


        -- ====================================================
        -- PROCESS RULES INSIDE THE GROUP
        -- ====================================================

        FOR v_rule IN

            SELECT
                rule_id,
                attribute_name,
                operator,
                value_type,
                numeric_value,
                text_value,
                boolean_value,
                failure_message

            FROM eligibility_rules

            WHERE group_id = v_group.group_id

            ORDER BY rule_id

        LOOP

            v_value := NULL;
            v_rule_pass := FALSE;


            -- ------------------------------------------------
            -- AGE is derived rather than stored.
            -- ------------------------------------------------

            IF v_rule.attribute_name = 'age' THEN

                IF v_age IS NOT NULL THEN
                    v_value := v_age::TEXT;
                END IF;


            -- ------------------------------------------------
            -- Try USER_PROFILES.
            -- ------------------------------------------------

            ELSIF v_profile ? v_rule.attribute_name THEN

                v_value :=
                    v_profile ->> v_rule.attribute_name;


            -- ------------------------------------------------
            -- Try APPLICATIONS.
            -- ------------------------------------------------

            ELSIF v_application IS NOT NULL
                  AND v_application ? v_rule.attribute_name THEN

                v_value :=
                    v_application ->> v_rule.attribute_name;

            END IF;


            -- ------------------------------------------------
            -- Missing information means we cannot safely make
            -- an authoritative eligibility decision.
            -- ------------------------------------------------

            IF v_value IS NULL THEN

                v_group_pass := FALSE;
                v_group_missing := TRUE;
                v_missing_evidence := TRUE;

                IF v_first_failure IS NULL THEN
                    v_first_failure :=
                        'Missing evidence for attribute: '
                        || v_rule.attribute_name;
                END IF;

                CONTINUE;

            END IF;


            -- =================================================
            -- NUMERIC RULE
            -- =================================================

            IF v_rule.value_type = 'numeric' THEN

                v_rule_pass :=
                    CASE v_rule.operator

                        WHEN '=' THEN
                            v_value::NUMERIC =
                                v_rule.numeric_value

                        WHEN '!=' THEN
                            v_value::NUMERIC <>
                                v_rule.numeric_value

                        WHEN '>' THEN
                            v_value::NUMERIC >
                                v_rule.numeric_value

                        WHEN '>=' THEN
                            v_value::NUMERIC >=
                                v_rule.numeric_value

                        WHEN '<' THEN
                            v_value::NUMERIC <
                                v_rule.numeric_value

                        WHEN '<=' THEN
                            v_value::NUMERIC <=
                                v_rule.numeric_value

                        ELSE FALSE

                    END;


            -- =================================================
            -- BOOLEAN RULE
            -- =================================================

            ELSIF v_rule.value_type = 'boolean' THEN

                v_rule_pass :=
                    CASE v_rule.operator

                        WHEN '=' THEN
                            v_value::BOOLEAN =
                                v_rule.boolean_value

                        WHEN '!=' THEN
                            v_value::BOOLEAN <>
                                v_rule.boolean_value

                        ELSE FALSE

                    END;


            -- =================================================
            -- TEXT RULE
            -- =================================================

            ELSIF v_rule.value_type = 'text' THEN


                -- ---------------------------------------------
                -- TEXT =
                -- ---------------------------------------------

                IF v_rule.operator = '=' THEN

                    v_rule_pass :=
                        LOWER(BTRIM(v_value))
                        =
                        LOWER(BTRIM(v_rule.text_value));


                -- ---------------------------------------------
                -- TEXT !=
                -- ---------------------------------------------

                ELSIF v_rule.operator = '!=' THEN

                    v_rule_pass :=
                        LOWER(BTRIM(v_value))
                        <>
                        LOWER(BTRIM(v_rule.text_value));


                -- ---------------------------------------------
                -- TEXT IN
                --
                -- Stored example:
                -- OBC,EBC,DNT
                -- ---------------------------------------------

                ELSIF v_rule.operator = 'IN' THEN

                    SELECT EXISTS
                    (
                        SELECT 1

                        FROM unnest(
                            string_to_array(
                                v_rule.text_value,
                                ','
                            )
                        ) AS x(item)

                        WHERE
                            LOWER(BTRIM(x.item))
                            =
                            LOWER(BTRIM(v_value))
                    )
                    INTO v_rule_pass;


                -- ---------------------------------------------
                -- TEXT NOT IN
                -- ---------------------------------------------

                ELSIF v_rule.operator = 'NOT IN' THEN

                    SELECT NOT EXISTS
                    (
                        SELECT 1

                        FROM unnest(
                            string_to_array(
                                v_rule.text_value,
                                ','
                            )
                        ) AS x(item)

                        WHERE
                            LOWER(BTRIM(x.item))
                            =
                            LOWER(BTRIM(v_value))
                    )
                    INTO v_rule_pass;


                ELSE

                    v_rule_pass := FALSE;

                END IF;

            END IF;


            -- ------------------------------------------------
            -- If one rule fails, the entire group does not
            -- satisfy the AND condition.
            -- ------------------------------------------------

            IF NOT v_rule_pass THEN

                v_group_pass := FALSE;

                IF v_first_failure IS NULL THEN

                    v_first_failure :=
                        COALESCE(
                            v_rule.failure_message,
                            'Eligibility condition failed: '
                            || v_rule.attribute_name
                        );

                END IF;

            END IF;


        END LOOP;


        -- ----------------------------------------------------
        -- If every condition in the current group passes,
        -- one valid OR path has been found.
        -- ----------------------------------------------------

        IF v_group_pass THEN

            v_any_group_pass := TRUE;

            EXIT;

        END IF;


    END LOOP;


    -- ========================================================
    -- FINAL DECISION
    -- ========================================================


    -- No rules configured.
    IF NOT v_has_groups THEN

        RETURN QUERY
        SELECT
            'needs_review'::TEXT,
            'No eligibility rule groups are configured for this scheme.'::TEXT;

        RETURN;

    END IF;


    -- One complete rule group passed.
    IF v_any_group_pass THEN

        -- Official rule set has been fully verified.
        IF v_rules_complete THEN

            RETURN QUERY
            SELECT
                'eligible'::TEXT,
                'The applicant satisfies a complete eligibility rule group.'::TEXT;

        ELSE

            -- This is intentional.
            -- Patch 05 marks incomplete rule sets so that a
            -- partial policy implementation is never presented
            -- as authoritative eligibility.

            RETURN QUERY
            SELECT
                'needs_review'::TEXT,
                'Stored conditions matched, but this scheme''s complete official eligibility rules have not yet been verified.'::TEXT;

        END IF;

        RETURN;

    END IF;


    -- Some evidence was NULL/unknown.
    IF v_missing_evidence THEN

        RETURN QUERY
        SELECT
            'needs_review'::TEXT,
            COALESCE(
                v_first_failure,
                'Additional evidence is required.'
            );

        RETURN;

    END IF;


    -- Every available alternative was evaluated and all failed.
    RETURN QUERY
    SELECT
        'ineligible'::TEXT,
        COALESCE(
            v_first_failure,
            'Applicant does not satisfy any eligibility rule group.'
        );

END;
$$;



-- ============================================================
-- TEST THE FUNCTION USING ACTUAL DATA
-- ============================================================
--
-- Arjun Patil has an existing K05 Yuvanidhi draft application.
--
-- His stored profile can therefore be evaluated against the
-- K05 rule group.
-- ============================================================

SELECT *
FROM evaluate_eligibility(

    (
        SELECT user_id
        FROM users
        WHERE email = 'arjun.patil@example.com'
    ),

    (
        SELECT scheme_id
        FROM schemes
        WHERE scheme_code = 'K05'
    )

);



-- ============================================================
-- PART 3: APPLICATION SUBMISSION PROCEDURE
-- ============================================================
--
-- PROCEDURE:
--
-- submit_scheme_application(
--      user email,
--      scheme code,
--      application kind
-- )
--
-- PURPOSE:
--
-- 1. Find user.
-- 2. Find scheme.
-- 3. Prevent duplicate application.
-- 4. Create a draft application.
-- 5. Execute evaluate_eligibility().
-- 6. Save result and explanation.
--
-- ============================================================

CREATE OR REPLACE PROCEDURE submit_scheme_application(
    p_email TEXT,
    p_scheme_code TEXT,
    p_application_kind TEXT DEFAULT 'fresh'
)
LANGUAGE plpgsql
AS $$
DECLARE

    v_user_id BIGINT;
    v_scheme_id BIGINT;

    v_application_id BIGINT;

    v_result TEXT;
    v_reason TEXT;

BEGIN

    -- --------------------------------------------------------
    -- Validate application type.
    -- --------------------------------------------------------

    IF p_application_kind NOT IN ('fresh', 'renewal') THEN

        RAISE EXCEPTION
            'application_kind must be fresh or renewal';

    END IF;


    -- --------------------------------------------------------
    -- Find user.
    -- --------------------------------------------------------

    SELECT user_id
    INTO v_user_id
    FROM users
    WHERE email = p_email;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'User with email % does not exist',
            p_email;

    END IF;


    -- --------------------------------------------------------
    -- Find scheme.
    -- --------------------------------------------------------

    SELECT scheme_id
    INTO v_scheme_id
    FROM schemes
    WHERE scheme_code = p_scheme_code;


    IF NOT FOUND THEN

        RAISE EXCEPTION
            'Scheme % does not exist',
            p_scheme_code;

    END IF;


    -- --------------------------------------------------------
    -- Prevent duplicate applications.
    -- --------------------------------------------------------

    IF EXISTS
    (
        SELECT 1
        FROM applications
        WHERE user_id = v_user_id
          AND scheme_id = v_scheme_id
    )
    THEN

        RAISE EXCEPTION
            'User has already created an application for scheme %',
            p_scheme_code;

    END IF;


    -- --------------------------------------------------------
    -- Create application.
    -- --------------------------------------------------------

    INSERT INTO applications
    (
        user_id,
        scheme_id,
        current_status,
        application_kind,
        created_at,
        updated_at
    )
    VALUES
    (
        v_user_id,
        v_scheme_id,
        'draft',
        p_application_kind,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING application_id
    INTO v_application_id;


    -- --------------------------------------------------------
    -- Run our eligibility function.
    -- --------------------------------------------------------

    SELECT
        eligibility_status,
        explanation

    INTO
        v_result,
        v_reason

    FROM evaluate_eligibility(
        v_user_id,
        v_scheme_id
    );


    -- --------------------------------------------------------
    -- Save eligibility result.
    -- --------------------------------------------------------

    UPDATE applications

    SET
        eligibility_result = v_result,
        eligibility_reason = v_reason,
        eligibility_checked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP

    WHERE application_id = v_application_id;


    RAISE NOTICE
        'Application % created. Eligibility result: %',
        v_application_id,
        v_result;

END;
$$;



-- ============================================================
-- SAFE PROCEDURE TEST
-- ============================================================
--
-- We use Lakshmi + N15 because this pair is not part of
-- the original seeded applications.
--
-- ROLLBACK means this test does NOT permanently alter
-- the populated database.
-- ============================================================

BEGIN;


CALL submit_scheme_application(
    'lakshmi.nayak@example.com',
    'N15',
    'fresh'
);


-- Show what the procedure created.

SELECT
    a.application_id,
    u.full_name,
    s.scheme_code,
    s.scheme_name,
    a.application_kind,
    a.current_status,
    a.eligibility_result,
    a.eligibility_reason

FROM applications a

JOIN users u
    ON a.user_id = u.user_id

JOIN schemes s
    ON a.scheme_id = s.scheme_id

WHERE u.email = 'lakshmi.nayak@example.com'
  AND s.scheme_code = 'N15';


-- Undo only the test application.

ROLLBACK;



-- ============================================================
-- PART 4: TRIGGER
-- ============================================================
--
-- PURPOSE:
--
-- Whenever application.current_status changes:
--
-- draft -> submitted
-- submitted -> under_review
-- under_review -> approved
--
-- PostgreSQL automatically inserts a row into
-- application_status_log, recording WHO made the change
-- (taken from the transaction setting app.current_user_id,
-- which the web app sets for every request).
--
-- The same trigger also enforces the application workflow:
--
--   draft        -> submitted | withdrawn
--   submitted    -> under_review | withdrawn
--   under_review -> approved | rejected | withdrawn
--
--   * students may only submit or withdraw
--   * officers may only review, approve or reject
--   * when a student submits, evaluate_eligibility() is run
--     again inside the trigger and 'ineligible' is refused
--
-- A second small trigger (force_student_draft) makes sure an
-- application inserted by the student role always starts as
-- a draft.
--
-- ============================================================


CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_text TEXT;
    v_actor_id   BIGINT;
    v_fresh      RECORD;
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;

    IF NEW.current_status IS DISTINCT FROM OLD.current_status THEN

        -- (a) Allowed transitions for everybody.
        IF NOT (
            (OLD.current_status = 'draft'
                AND NEW.current_status IN ('submitted', 'withdrawn'))
         OR (OLD.current_status = 'submitted'
                AND NEW.current_status IN ('under_review', 'withdrawn'))
         OR (OLD.current_status = 'under_review'
                AND NEW.current_status IN ('approved', 'rejected', 'withdrawn'))
        ) THEN
            RAISE EXCEPTION 'Invalid application status change: % -> %',
                OLD.current_status, NEW.current_status
                USING ERRCODE = '23514';
        END IF;

        -- (b) Who may make which change.
        IF current_user = 'scheme_student_app'
           AND NEW.current_status NOT IN ('submitted', 'withdrawn') THEN
            RAISE EXCEPTION 'Students may only submit or withdraw an application.'
                USING ERRCODE = '42501';
        END IF;

        IF current_user = 'scheme_officer_app'
           AND NEW.current_status NOT IN ('under_review', 'approved', 'rejected') THEN
            RAISE EXCEPTION 'Officers may only review, approve or reject an application.'
                USING ERRCODE = '42501';
        END IF;

        -- (c) A student submission is re-checked by the rule engine.
        IF current_user = 'scheme_student_app'
           AND NEW.current_status = 'submitted' THEN

            SELECT eligibility_status, explanation
            INTO v_fresh
            FROM evaluate_eligibility(NEW.user_id, NEW.scheme_id);

            IF v_fresh.eligibility_status = 'ineligible' THEN
                RAISE EXCEPTION 'Not eligible: %', v_fresh.explanation
                    USING ERRCODE = '23514';
            END IF;

            NEW.eligibility_result     := v_fresh.eligibility_status;
            NEW.eligibility_reason     := v_fresh.explanation;
            NEW.eligibility_checked_at := CURRENT_TIMESTAMP;
        END IF;

        -- (d) History row, with the authenticated actor.
        v_actor_text := current_setting('app.current_user_id', TRUE);

        IF v_actor_text IS NOT NULL AND v_actor_text <> '' THEN
            v_actor_id := v_actor_text::BIGINT;
        END IF;

        INSERT INTO application_status_log (
            application_id, old_status, new_status,
            changed_at, changed_by, remarks
        )
        VALUES (
            NEW.application_id, OLD.current_status, NEW.current_status,
            CURRENT_TIMESTAMP, v_actor_id,
            'Automatically recorded by application status trigger.'
        );
    END IF;

    RETURN NEW;
END;
$$;



-- Remove old trigger if script is rerun.

DROP TRIGGER IF EXISTS
    trg_application_status_change
ON applications;



-- Create trigger.

CREATE TRIGGER trg_application_status_change

BEFORE UPDATE OF current_status
ON applications

FOR EACH ROW

EXECUTE FUNCTION log_application_status_change();



-- Students can only create drafts.

CREATE OR REPLACE FUNCTION force_student_draft()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_user = 'scheme_student_app' THEN
        NEW.current_status := 'draft';
        NEW.applied_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_student_draft ON applications;

CREATE TRIGGER trg_force_student_draft
BEFORE INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION force_student_draft();



-- ============================================================
-- SAFE TRIGGER TEST
-- ============================================================
--
-- Arjun's K05 application is currently draft in the seed data.
--
-- Temporarily:
--
-- draft -> submitted
--
-- The trigger should automatically create a history record.
--
-- Then we ROLLBACK everything.
-- ============================================================

BEGIN;


UPDATE applications a

SET current_status = 'submitted'

FROM users u,
     schemes s

WHERE a.user_id = u.user_id
  AND a.scheme_id = s.scheme_id

  AND u.email = 'arjun.patil@example.com'
  AND s.scheme_code = 'K05'

  AND a.current_status = 'draft';



-- ------------------------------------------------------------
-- Check the automatically generated history.
-- ------------------------------------------------------------

SELECT
    u.full_name,
    s.scheme_code,
    l.old_status,
    l.new_status,
    l.changed_at,
    l.remarks

FROM application_status_log l

JOIN applications a
    ON l.application_id = a.application_id

JOIN users u
    ON a.user_id = u.user_id

JOIN schemes s
    ON a.scheme_id = s.scheme_id

WHERE u.email = 'arjun.patil@example.com'
  AND s.scheme_code = 'K05'

ORDER BY l.changed_at DESC;



-- Restore database to its original state.

ROLLBACK;



-- ============================================================
-- FINAL VERIFICATION
-- ============================================================


-- Verify function exists.

SELECT
    routine_name,
    routine_type

FROM information_schema.routines

WHERE routine_schema = 'public'
  AND routine_name IN (
      'evaluate_eligibility',
      'submit_scheme_application'
  )

ORDER BY routine_name;



-- Verify trigger exists.

SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing

FROM information_schema.triggers

WHERE trigger_schema = 'public'
  AND trigger_name =
      'trg_application_status_change';