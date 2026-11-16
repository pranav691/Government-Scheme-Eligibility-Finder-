-- ============================================================
-- 18_rule_attribute_catalog.sql
-- Make the DATABASE reject eligibility rules that
-- evaluate_eligibility() cannot evaluate.
--
-- Problem fixed:
--   eligibility_rules.attribute_name was free text. A rule such as
--     gender >= 5   (value_type = numeric)
--   made evaluate_eligibility() fail with a cast error
--   ('female'::NUMERIC) for EVERY student checking that scheme,
--   and a typo such as 'cgap' silently produced needs_review.
--
-- Fix (DBMS concepts):
--   1. A lookup table eligibility_attributes(attribute_name, value_type).
--   2. A COMPOSITE FOREIGN KEY from eligibility_rules
--      (attribute_name, value_type) -> eligibility_attributes,
--      so the attribute must exist AND the type must match.
--   3. A CHECK constraint that allows only operators that make sense
--      for each value type.
--
-- Safe to rerun. Run as scheme_user on scheme_finder.
-- ============================================================

BEGIN;
SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS eligibility_attributes (
    attribute_name VARCHAR(100) PRIMARY KEY,
    value_type     VARCHAR(20)  NOT NULL,
    source         VARCHAR(20)  NOT NULL,
    description    TEXT,
    CONSTRAINT chk_attr_value_type CHECK (
        value_type IN ('numeric', 'text', 'boolean')
    ),
    CONSTRAINT chk_attr_source CHECK (
        source IN ('profile', 'derived', 'application')
    ),
    -- Target of the composite foreign key below.
    CONSTRAINT uq_attr_name_type UNIQUE (attribute_name, value_type)
);

INSERT INTO eligibility_attributes (attribute_name, value_type, source, description)
VALUES
    -- numeric
    ('age',                       'numeric', 'derived',     'Calculated from date_of_birth'),
    ('annual_family_income',      'numeric', 'profile',     'Annual family income in rupees'),
    ('attendance_percentage',     'numeric', 'application', 'Attendance for renewal applications'),
    ('beneficiary_siblings',      'numeric', 'profile',     'Siblings already receiving the benefit'),
    ('cgpa',                      'numeric', 'profile',     'CGPA on a 10-point scale'),
    ('class_12_percentage',       'numeric', 'profile',     'Class 12 percentage'),
    ('class_12_percentile',       'numeric', 'profile',     'Class 12 percentile'),
    ('disability_percentage',     'numeric', 'profile',     'Certified disability percentage'),
    ('distance_km',               'numeric', 'profile',     'Distance from home to institution'),
    ('marks_percentage',          'numeric', 'profile',     'Latest qualifying exam percentage'),
    ('unemployment_days',         'numeric', 'profile',     'Days unemployed since graduation'),
    ('year_of_study',             'numeric', 'profile',     'Current year of study'),
    -- text
    ('admission_entry_type',      'text',    'profile',     'first_year or lateral_entry'),
    ('application_kind',          'text',    'application', 'fresh or renewal'),
    ('current_course',            'text',    'profile',     'Current course name'),
    ('degree_level',              'text',    'profile',     'e.g. undergraduate, postgraduate'),
    ('district',                  'text',    'profile',     'District of residence'),
    ('domicile_state',            'text',    'profile',     'State of domicile'),
    ('employment_status',         'text',    'profile',     'Employment status'),
    ('gender',                    'text',    'profile',     'female, male, other, prefer_not_to_say'),
    ('institution_approval_body', 'text',    'profile',     'e.g. AICTE, UGC'),
    ('institution_name',          'text',    'profile',     'Institution name'),
    ('parent_occupation',         'text',    'profile',     'Parent occupation'),
    ('parent_service_status',     'text',    'profile',     'Parent service status'),
    ('residence_type',            'text',    'profile',     'rural, urban, semi_urban, other'),
    ('social_category',           'text',    'profile',     'e.g. SC, ST, OBC, GEN'),
    -- boolean
    ('aicte_approved_degree',     'boolean', 'profile',     'Course is AICTE approved'),
    ('artisan_status',            'boolean', 'profile',     'Registered artisan'),
    ('currently_studying',        'boolean', 'profile',     'Currently enrolled'),
    ('disability_status',         'boolean', 'profile',     'Has a disability'),
    ('hostel_available',          'boolean', 'profile',     'Institution hostel available'),
    ('hosteller',                 'boolean', 'profile',     'Lives in a hostel'),
    ('minority_status',           'boolean', 'profile',     'Belongs to a minority community'),
    ('orphan_status',             'boolean', 'profile',     'Orphan'),
    ('other_scholarship',         'boolean', 'profile',     'Receives another scholarship'),
    ('parent_martyred_status',    'boolean', 'profile',     'Parent martyred in service'),
    ('parental_death_covid',      'boolean', 'profile',     'Parent died due to COVID-19'),
    ('previous_award_verified',   'boolean', 'application', 'Previous award verified (renewals)'),
    ('self_employed',             'boolean', 'profile',     'Self-employed'),
    ('training_status',           'boolean', 'profile',     'Completed required training'),
    ('weaver_status',             'boolean', 'profile',     'Registered weaver')
ON CONFLICT (attribute_name) DO UPDATE
SET value_type  = EXCLUDED.value_type,
    source      = EXCLUDED.source,
    description = EXCLUDED.description;

-- Show any EXISTING rule that would violate the new constraints.
-- If this returns rows, the ALTER TABLEs below fail and everything
-- is rolled back; fix those rules first.
SELECT r.rule_id, r.attribute_name, r.value_type, r.operator
FROM eligibility_rules r
LEFT JOIN eligibility_attributes a
       ON a.attribute_name = r.attribute_name
      AND a.value_type     = r.value_type
WHERE a.attribute_name IS NULL;

ALTER TABLE eligibility_rules
    DROP CONSTRAINT IF EXISTS fk_rules_attribute;

ALTER TABLE eligibility_rules
    ADD CONSTRAINT fk_rules_attribute
    FOREIGN KEY (attribute_name, value_type)
    REFERENCES eligibility_attributes (attribute_name, value_type)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

ALTER TABLE eligibility_rules
    DROP CONSTRAINT IF EXISTS chk_rule_operator_matches_type;

ALTER TABLE eligibility_rules
    ADD CONSTRAINT chk_rule_operator_matches_type CHECK (
        (value_type = 'numeric' AND operator IN ('=', '!=', '>', '>=', '<', '<='))
        OR (value_type = 'text' AND operator IN ('=', '!=', 'IN', 'NOT IN'))
        OR (value_type = 'boolean' AND operator IN ('=', '!='))
    );

-- Readers of the rule catalogue may also read the attribute list.
GRANT SELECT ON eligibility_attributes
TO scheme_admin_app, scheme_catalogue_reader;

COMMIT;

-- ------------------------------------------------------------
-- VIVA DEMO: both of these must FAIL.
-- ------------------------------------------------------------
-- 1. Wrong type for an attribute (composite FK violation):
--    INSERT INTO eligibility_rules (group_id, attribute_name, operator, value_type, numeric_value)
--    VALUES ((SELECT MIN(group_id) FROM eligibility_rule_groups), 'gender', '>=', 'numeric', 5);
--
-- 2. Operator that makes no sense for the type (CHECK violation):
--    INSERT INTO eligibility_rules (group_id, attribute_name, operator, value_type, boolean_value)
--    VALUES ((SELECT MIN(group_id) FROM eligibility_rule_groups), 'orphan_status', '>', 'boolean', TRUE);
