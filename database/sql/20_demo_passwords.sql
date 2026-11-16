-- ============================================================
-- 20_demo_passwords.sql
-- Give the seeded demo accounts a usable bcrypt password.
--
-- 03 seeds users with the placeholder 'DEMO_ONLY_NOT_A_REAL_HASH',
-- which can never log in. This script replaces ONLY that
-- placeholder, so passwords you already set are left untouched.
--
-- Demo password for every seeded account:  Demo@1234
-- (local demo data only - never reuse it for a real account)
--
-- pgcrypto's crypt(..., gen_salt('bf')) produces a standard bcrypt
-- ($2a$) hash, which the website verifies with bcryptjs.
-- Run as scheme_user. Safe to rerun.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users
SET password_hash = crypt('Demo@1234', gen_salt('bf', 10))
WHERE password_hash = 'DEMO_ONLY_NOT_A_REAL_HASH'
RETURNING user_id, email;

COMMIT;
