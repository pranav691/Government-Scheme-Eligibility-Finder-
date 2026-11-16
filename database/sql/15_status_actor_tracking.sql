-- ============================================================
-- 15_status_actor_tracking.sql
-- Record authenticated application actor in status history
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_text TEXT;
    v_actor_id BIGINT;
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;

    IF NEW.current_status IS DISTINCT FROM OLD.current_status THEN

        v_actor_text :=
            current_setting('app.current_user_id', TRUE);

        IF v_actor_text IS NOT NULL
           AND v_actor_text <> '' THEN
            v_actor_id := v_actor_text::BIGINT;
        ELSE
            v_actor_id := NULL;
        END IF;

        INSERT INTO application_status_log (
            application_id,
            old_status,
            new_status,
            changed_at,
            changed_by,
            remarks
        )
        VALUES (
            NEW.application_id,
            OLD.current_status,
            NEW.current_status,
            CURRENT_TIMESTAMP,
            v_actor_id,
            'Automatically recorded by application status trigger.'
        );

    END IF;

    RETURN NEW;
END;
$$;

COMMIT;