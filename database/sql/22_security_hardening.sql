-- ============================================================
-- 22_security_hardening.sql
-- Closes gaps found in the final review. Run LAST, as scheme_user.
-- Safe to rerun.
--
-- 1. COLUMN-LEVEL privileges on applications.
--    RLS limits WHICH ROWS a student touches; it did not limit
--    WHICH COLUMNS. A student could have set their own
--    current_status = 'approved' or previous_award_verified = TRUE.
--
-- 2. DATABASE-ENFORCED status workflow (trigger).
--    Valid transitions:
--      draft        -> submitted | withdrawn
--      submitted    -> under_review | withdrawn
--      under_review -> approved | rejected | withdrawn
--    Students may only submit / withdraw. Officers may only move
--    an application to under_review / approved / rejected.
--    When a student submits, the trigger re-runs
--    evaluate_eligibility() itself and refuses 'ineligible', so
--    the rule cannot be bypassed by calling the DB directly.
--
-- 3. New drafts created by the student role always start as 'draft'.
--
-- 4. The admin role may refresh scheme embeddings (the admin
--    screens call the embedding service after a scheme is
--    created or edited).
-- ============================================================

BEGIN;
SET LOCAL search_path = public;

-- ------------------------------------------------------------
-- 1. Column-level privileges for the student role
-- ------------------------------------------------------------
REVOKE INSERT, UPDATE ON TABLE applications FROM scheme_student_app;

-- Needed by submit_scheme_application() when creating a draft.
GRANT INSERT (
    user_id, scheme_id, current_status, application_kind,
    created_at, updated_at
) ON applications TO scheme_student_app;

-- Needed when the student submits a draft. NOT granted:
-- user_id, scheme_id, application_kind, previous_award_verified,
-- attendance_percentage (those are officer/admin evidence).
GRANT UPDATE (
    current_status, applied_at,
    eligibility_result, eligibility_reason, eligibility_checked_at,
    updated_at
) ON applications TO scheme_student_app;


-- ------------------------------------------------------------
-- 2. Status workflow + actor logging trigger
-- ------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_application_status_change ON applications;

CREATE TRIGGER trg_application_status_change
BEFORE UPDATE OF current_status
ON applications
FOR EACH ROW
EXECUTE FUNCTION log_application_status_change();


-- ------------------------------------------------------------
-- 3. Students can only create drafts
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
-- 4. Admin may refresh embeddings for new / edited schemes
-- ------------------------------------------------------------
GRANT INSERT, UPDATE ON TABLE scheme_embeddings TO scheme_admin_app;

COMMIT;

-- ============================================================
-- VIVA DEMO (run as scheme_user; everything is rolled back)
--
-- BEGIN;
-- SET LOCAL ROLE scheme_student_app;
-- SELECT set_config('app.current_user_id', '3', TRUE);
-- -- Student tries to approve their own application:
-- UPDATE applications SET current_status = 'approved'
-- WHERE user_id = 3;                    -- ERROR: permission denied
-- ROLLBACK;
-- ============================================================
