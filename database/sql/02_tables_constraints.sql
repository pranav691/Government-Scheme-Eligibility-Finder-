-- Government / State Scheme Eligibility Finder
-- NOTE: this is the ORIGINAL schema. Later scripts add columns and
-- tables (05: eligibility_rules_complete, application_kind, extra profile
-- columns; 18: eligibility_attributes). Draw the final ER diagram from the
-- live database, not from this file alone.
-- Final schema: 12 tables, 122 stored columns, 13 foreign keys.
-- Target: existing scheme_finder database (PostgreSQL + pgvector).
-- Run using psql -v ON_ERROR_STOP=1 -f 02_tables_constraints.sql
-- Derived age is calculated from date_of_birth and is not stored.
-- This script creates tables; it does not insert seed data.

BEGIN;
SET LOCAL search_path = public;

CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Roles
CREATE TABLE roles (
    role_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Users
CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id SMALLINT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id)
        REFERENCES roles(role_id) ON DELETE RESTRICT
);

-- 3. Profiles: UNIQUE user_id gives each user at most one profile.
CREATE TABLE user_profiles (
    profile_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(30),
    domicile_state VARCHAR(100),
    district VARCHAR(100),
    residence_type VARCHAR(20),
    social_category VARCHAR(30),
    minority_status BOOLEAN,
    disability_status BOOLEAN,
    disability_percentage NUMERIC(5,2),
    annual_family_income NUMERIC(14,2),
    current_course VARCHAR(120),
    degree_level VARCHAR(50),
    year_of_study SMALLINT,
    institution_name VARCHAR(200),
    institution_approval_body VARCHAR(150),
    marks_percentage NUMERIC(5,2),
    cgpa NUMERIC(4,2),
    class_12_percentage NUMERIC(5,2),
    employment_status VARCHAR(40),
    unemployment_days INTEGER,
    self_employed BOOLEAN,
    artisan_status BOOLEAN,
    weaver_status BOOLEAN,
    training_status BOOLEAN,
    parent_occupation VARCHAR(100),
    parent_service_status VARCHAR(60),
    parent_martyred_status BOOLEAN,
    orphan_status BOOLEAN,
    parental_death_covid BOOLEAN,
    other_scholarship BOOLEAN,
    currently_studying BOOLEAN,
    hosteller BOOLEAN,
    hostel_available BOOLEAN,
    distance_km NUMERIC(8,2),
    beneficiary_siblings SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_profile_gender CHECK (
        gender IS NULL OR LOWER(gender) IN
            ('female', 'male', 'other', 'prefer_not_to_say')
    ),
    CONSTRAINT chk_residence_type CHECK (
        residence_type IS NULL OR
        residence_type IN ('rural', 'urban', 'semi_urban', 'other')
    ),
    CONSTRAINT chk_disability_percentage CHECK (
        disability_percentage IS NULL OR disability_percentage BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_family_income CHECK (
        annual_family_income IS NULL OR annual_family_income >= 0
    ),
    CONSTRAINT chk_year_of_study CHECK (
        year_of_study IS NULL OR year_of_study BETWEEN 1 AND 10
    ),
    CONSTRAINT chk_marks_percentage CHECK (
        marks_percentage IS NULL OR marks_percentage BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_cgpa CHECK (cgpa IS NULL OR cgpa BETWEEN 0 AND 10),
    CONSTRAINT chk_class_12_percentage CHECK (
        class_12_percentage IS NULL OR class_12_percentage BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_unemployment_days CHECK (
        unemployment_days IS NULL OR unemployment_days >= 0
    ),
    CONSTRAINT chk_distance CHECK (distance_km IS NULL OR distance_km >= 0),
    CONSTRAINT chk_beneficiary_siblings CHECK (
        beneficiary_siblings IS NULL OR beneficiary_siblings >= 0
    )
);

-- 4. Schemes
CREATE TABLE schemes (
    scheme_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scheme_code VARCHAR(50) NOT NULL UNIQUE,
    scheme_name VARCHAR(250) NOT NULL,
    government_level VARCHAR(20) NOT NULL,
    state_name VARCHAR(100),
    department VARCHAR(200),
    scheme_type VARCHAR(80),
    description TEXT,
    benefit_summary TEXT,
    application_mode VARCHAR(30),
    application_url TEXT,
    source_url TEXT,
    academic_year VARCHAR(20),
    application_start_date DATE,
    application_deadline DATE,
    scheme_status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified',
    last_verified_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_government_level CHECK (
        government_level IN ('national', 'state')
    ),
    CONSTRAINT chk_scheme_state CHECK (
        (government_level = 'national' AND state_name IS NULL)
        OR (government_level = 'state' AND state_name IS NOT NULL)
    ),
    CONSTRAINT chk_application_mode CHECK (
        application_mode IS NULL OR
        application_mode IN ('online', 'offline', 'both', 'unknown')
    ),
    CONSTRAINT chk_scheme_status CHECK (
        scheme_status IN ('upcoming', 'open', 'closed', 'expired')
    ),
    CONSTRAINT chk_verification_status CHECK (
        verification_status IN ('unverified', 'verified', 'needs_review')
    ),
    CONSTRAINT chk_application_dates CHECK (
        application_start_date IS NULL OR application_deadline IS NULL
        OR application_deadline >= application_start_date
    )
);

-- 5. Rule groups: evaluation combines alternative groups using OR.
CREATE TABLE eligibility_rule_groups (
    group_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scheme_id BIGINT NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    group_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rule_groups_scheme FOREIGN KEY (scheme_id)
        REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    CONSTRAINT chk_group_order CHECK (group_order > 0),
    CONSTRAINT uq_scheme_group_order UNIQUE (scheme_id, group_order)
);

-- 6. Rules: evaluation combines the rules within one group using AND.
-- The DDL stores conditions; evaluation is implemented in a later function.
CREATE TABLE eligibility_rules (
    rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    numeric_value NUMERIC(14,2),
    text_value TEXT,
    boolean_value BOOLEAN,
    failure_message TEXT,
    CONSTRAINT fk_rules_group FOREIGN KEY (group_id)
        REFERENCES eligibility_rule_groups(group_id) ON DELETE CASCADE,
    CONSTRAINT chk_rule_operator CHECK (
        operator IN ('=', '!=', '>', '>=', '<', '<=', 'IN', 'NOT IN')
    ),
    CONSTRAINT chk_rule_value_type CHECK (
        value_type IN ('numeric', 'text', 'boolean')
    ),
    CONSTRAINT chk_rule_typed_value CHECK (
        (value_type = 'numeric' AND numeric_value IS NOT NULL
            AND text_value IS NULL AND boolean_value IS NULL)
        OR (value_type = 'text' AND numeric_value IS NULL
            AND text_value IS NOT NULL AND boolean_value IS NULL)
        OR (value_type = 'boolean' AND numeric_value IS NULL
            AND text_value IS NULL AND boolean_value IS NOT NULL)
    )
);

-- 7. Categories: a nullable self-FK permits root categories.
-- The CHECK blocks self-parenting only; longer cycles need separate logic.
CREATE TABLE categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    parent_category_id BIGINT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id)
        REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT chk_category_not_own_parent CHECK (
        parent_category_id IS NULL OR parent_category_id <> category_id
    )
);

-- 8. Associative relation: both columns together form the primary key.
CREATE TABLE scheme_categories (
    scheme_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    CONSTRAINT pk_scheme_categories PRIMARY KEY (scheme_id, category_id),
    CONSTRAINT fk_scheme_categories_scheme FOREIGN KEY (scheme_id)
        REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    CONSTRAINT fk_scheme_categories_category FOREIGN KEY (category_id)
        REFERENCES categories(category_id) ON DELETE CASCADE
);

-- 9. Required-document records are specific to their owning scheme.
CREATE TABLE scheme_documents (
    document_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scheme_id BIGINT NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    CONSTRAINT fk_documents_scheme FOREIGN KEY (scheme_id)
        REFERENCES schemes(scheme_id) ON DELETE CASCADE,
    CONSTRAINT uq_scheme_document_name UNIQUE (scheme_id, document_name)
);

-- 10. At most one application per user and scheme.
CREATE TABLE applications (
    application_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    scheme_id BIGINT NOT NULL,
    applied_at TIMESTAMPTZ,
    current_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    eligibility_result VARCHAR(20),
    eligibility_reason TEXT,
    eligibility_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_applications_scheme FOREIGN KEY (scheme_id)
        REFERENCES schemes(scheme_id) ON DELETE RESTRICT,
    CONSTRAINT uq_user_scheme_application UNIQUE (user_id, scheme_id),
    CONSTRAINT chk_application_status CHECK (
        current_status IN
            ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    ),
    CONSTRAINT chk_eligibility_result CHECK (
        eligibility_result IS NULL OR
        eligibility_result IN ('eligible', 'ineligible', 'needs_review')
    )
);

-- 11. changed_by is optional and differs from the application's owner.
-- An application may have zero log records; logging triggers are added later.
CREATE TABLE application_status_log (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by BIGINT,
    remarks TEXT,
    CONSTRAINT fk_status_log_application FOREIGN KEY (application_id)
        REFERENCES applications(application_id) ON DELETE CASCADE,
    CONSTRAINT fk_status_log_user FOREIGN KEY (changed_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_log_old_status CHECK (
        old_status IS NULL OR old_status IN
            ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    ),
    CONSTRAINT chk_log_new_status CHECK (
        new_status IN
            ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
    )
);

-- 12. UNIQUE scheme_id gives each scheme at most one embedding.
CREATE TABLE scheme_embeddings (
    embedding_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scheme_id BIGINT NOT NULL UNIQUE,
    searchable_text TEXT NOT NULL,
    model_name VARCHAR(120) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    model_version VARCHAR(50),
    embedding VECTOR(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_embeddings_scheme FOREIGN KEY (scheme_id)
        REFERENCES schemes(scheme_id) ON DELETE CASCADE
);

-- updated_at defaults apply on INSERT. Automatic updates need later triggers.
COMMIT;
