-- 05_patch_rule_corrections.sql
-- Run AFTER 02, 03 and your source_url updates. Does not execute application logic.
-- New evidence is deliberately NULL, never inferred from synthetic demo records.
-- Do not rerun the original 03 seed after this migration: it contains superseded rules.
-- Sources checked 2026-10-28:
-- https://scholarships.gov.in/public/schemeGuidelines/CSSS_GUIDLINES_07022024_updated.pdf
-- https://www.myscheme.gov.in/schemes/psgs-deg
-- https://www.myscheme.gov.in/schemes/sak-deg
-- https://kswdc.karnataka.gov.in/21/udyogini/en
-- https://kaushalya.karnataka.gov.in/21/yuvanidhi-scheme/en
-- https://kmdc.karnataka.gov.in/22/shrama-shakthi/en
BEGIN;
SET LOCAL search_path = public;
SET LOCAL lock_timeout = '10s';

LOCK TABLE schemes, eligibility_rule_groups, eligibility_rules,
           categories, scheme_categories IN SHARE ROW EXCLUSIVE MODE;

-- Stop instead of silently applying only part of a patch to an unexpected database.
DO $$
BEGIN
    IF current_database() <> 'scheme_finder' THEN
        RAISE EXCEPTION 'Connect to scheme_finder before running this patch';
    END IF;
    IF (SELECT count(*) FROM schemes WHERE scheme_code IN
        ('N01','N02','N03','N04','N05','N06','N07','N08','N09','N10',
         'N11','N12','N13','N14','N15','K01','K02','K03','K04','K05',
         'K06','K07','K08','K09','K10')) <> 25 THEN
        RAISE EXCEPTION 'Expected all 25 original scheme codes';
    END IF;
    IF EXISTS (
        SELECT 1 FROM (VALUES ('N01',1),('N01',2),('N04',1),('N04',2),
          ('N05',1),('N05',2),('N14',1),('N14',2),('K05',1),('K05',2),
          ('K09',1),('K10',1)) v(code,ord)
        LEFT JOIN schemes s ON s.scheme_code=v.code
        LEFT JOIN eligibility_rule_groups g ON g.scheme_id=s.scheme_id
              AND g.group_order=v.ord
        WHERE g.group_id IS NULL
    ) THEN RAISE EXCEPTION 'Expected seeded rule groups are missing'; END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_name='Handloom Support')
       OR NOT EXISTS (SELECT 1 FROM categories WHERE category_name='Artisan & Handloom')
    THEN RAISE EXCEPTION 'Expected category names are missing'; END IF;
END $$;

-- Snapshot values that this migration must preserve.
CREATE TEMP TABLE patch05_schemes_before ON COMMIT DROP AS
SELECT scheme_id, scheme_code, scheme_name, source_url, application_url,
       benefit_summary, verification_status FROM schemes;

-- 1. Store evidence needed by corrected conditions.
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS class_12_percentile NUMERIC(5,2)
        CHECK (class_12_percentile BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS admission_entry_type TEXT
        CHECK (admission_entry_type IN ('first_year','lateral_entry','other')),
    ADD COLUMN IF NOT EXISTS aicte_approved_degree BOOLEAN;

COMMENT ON COLUMN user_profiles.class_12_percentile IS
    'Percentile among successful candidates in the relevant Class XII board/stream; not marks percentage. NULL until supported by evidence.';
COMMENT ON COLUMN user_profiles.aicte_approved_degree IS
    'Whether the current degree course/institution meets the AICTE approval requirement; NULL when unknown.';

ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS application_kind TEXT
        CHECK (application_kind IN ('fresh','renewal')),
    ADD COLUMN IF NOT EXISTS previous_award_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC(5,2)
        CHECK (attendance_percentage BETWEEN 0 AND 100);

COMMENT ON COLUMN applications.previous_award_verified IS
    'Verified previous award for THIS scheme and renewal cycle. Never infer from approved demo status. Officer/backend-managed evidence.';
COMMENT ON COLUMN applications.attendance_percentage IS
    'Attendance for the academic period relevant to this application/renewal.';

-- A scheme can have verified source information while its automated rules are incomplete.
ALTER TABLE schemes ADD COLUMN IF NOT EXISTS eligibility_rules_complete BOOLEAN
    NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN schemes.eligibility_rules_complete IS
    'Default FALSE. Evaluator must return needs_review for a rule match until a full policy audit marks the rules complete. Independent of verification_status.';

-- 2. Correct the N14 rule in place, retaining its rule_id.
DO $$
BEGIN
    IF (SELECT count(*) FROM eligibility_rules r
        JOIN eligibility_rule_groups g USING(group_id)
        JOIN schemes s USING(scheme_id)
        WHERE s.scheme_code='N14' AND g.group_order=1
          AND r.attribute_name IN ('class_12_percentage','class_12_percentile')) <> 1
    THEN RAISE EXCEPTION 'Expected exactly one N14 percentile/percentage rule'; END IF;
END $$;

UPDATE eligibility_rules r
SET attribute_name='class_12_percentile', operator='>', value_type='numeric',
    numeric_value=80, text_value=NULL, boolean_value=NULL,
    failure_message='Class XII percentile must be above 80 in the relevant board/stream.'
FROM eligibility_rule_groups g JOIN schemes s USING(scheme_id)
WHERE r.group_id=g.group_id AND s.scheme_code='N14' AND g.group_order=1
  AND r.attribute_name IN ('class_12_percentage','class_12_percentile');

-- 3. Stable logical identity for the existing rule format. Different comparison
-- operators remain allowed (e.g. age >= 18 AND age <= 55).
-- Existing duplicates abort the transaction; they are not silently deleted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rules_group_attribute_operator
    ON eligibility_rules(group_id, attribute_name, operator);

-- 4. Keep K10's existing first group for General/Special (non-SC/ST) applicants;
-- add its SC/ST alternative. Existing additional custom groups are not altered.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM eligibility_rule_groups g JOIN schemes s USING(scheme_id)
        WHERE s.scheme_code='K10' AND g.group_order=2
          AND g.group_name <> 'SC/ST women self-employment')
    THEN RAISE EXCEPTION 'K10 group 2 already contains custom rules; review before patching'; END IF;
END $$;
UPDATE eligibility_rule_groups g SET group_name='General/Special women self-employment'
FROM schemes s WHERE s.scheme_id=g.scheme_id AND s.scheme_code='K10' AND g.group_order=1;
INSERT INTO eligibility_rule_groups(scheme_id,group_name,group_order,is_active)
SELECT scheme_id,'SC/ST women self-employment',2,TRUE FROM schemes WHERE scheme_code='K10'
ON CONFLICT(scheme_id,group_order) DO NOTHING;

CREATE TEMP TABLE patch05_rules (
    code TEXT, ord INTEGER, attribute_name TEXT, operator TEXT, value_type TEXT,
    numeric_value NUMERIC, text_value TEXT, boolean_value BOOLEAN, message TEXT
) ON COMMIT DROP;
INSERT INTO patch05_rules VALUES
('N01',1,'application_kind','=','text',NULL,'fresh',NULL,'Fresh group requires a fresh application.'),
('N01',2,'application_kind','=','text',NULL,'renewal',NULL,'Renewal group requires a renewal application.'),
('N01',2,'previous_award_verified','=','boolean',NULL,NULL,TRUE,'A previous award for this scheme must be verified.'),
('N14',1,'application_kind','=','text',NULL,'fresh',NULL,'Fresh group requires a fresh application.'),
('N14',2,'application_kind','=','text',NULL,'renewal',NULL,'Renewal group requires a renewal application.'),
('N14',2,'previous_award_verified','=','boolean',NULL,NULL,TRUE,'A previous award for this scheme must be verified.'),
('N14',2,'attendance_percentage','>=','numeric',75,NULL,NULL,'Renewal attendance must be at least 75%.'),
('N04',1,'admission_entry_type','=','text',NULL,'first_year',NULL,'Admission route must match this eligibility group.'),
('N04',1,'year_of_study','=','numeric',1,NULL,NULL,'Year of study must match the admission route.'),
('N04',1,'aicte_approved_degree','=','boolean',NULL,NULL,TRUE,'An eligible AICTE-approved degree course is required.'),
('N04',2,'admission_entry_type','=','text',NULL,'lateral_entry',NULL,'Admission route must match this eligibility group.'),
('N04',2,'year_of_study','=','numeric',2,NULL,NULL,'Year of study must match the admission route.'),
('N04',2,'aicte_approved_degree','=','boolean',NULL,NULL,TRUE,'An eligible AICTE-approved degree course is required.'),
('N05',1,'admission_entry_type','=','text',NULL,'first_year',NULL,'Admission route must match this eligibility group.'),
('N05',1,'year_of_study','=','numeric',1,NULL,NULL,'Year of study must match the admission route.'),
('N05',1,'aicte_approved_degree','=','boolean',NULL,NULL,TRUE,'An eligible AICTE-approved degree course is required.'),
('N05',2,'admission_entry_type','=','text',NULL,'lateral_entry',NULL,'Admission route must match this eligibility group.'),
('N05',2,'year_of_study','=','numeric',2,NULL,NULL,'Year of study must match the admission route.'),
('N05',2,'aicte_approved_degree','=','boolean',NULL,NULL,TRUE,'An eligible AICTE-approved degree course is required.'),
('K05',1,'currently_studying','=','boolean',NULL,NULL,FALSE,'Candidates pursuing studies are excluded.'),
('K10',1,'gender','=','text',NULL,'female',NULL,'Applicant must be a woman.'),
('K10',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Karnataka residence is required.'),
('K10',1,'age','>=','numeric',18,NULL,NULL,'Applicant must be at least 18.'),
('K10',1,'age','<=','numeric',55,NULL,NULL,'Applicant must be no older than 55.'),
('K05',2,'currently_studying','=','boolean',NULL,NULL,FALSE,'Candidates pursuing studies are excluded.'),
('K10',2,'gender','=','text',NULL,'female',NULL,'Applicant must be a woman.'),
('K10',2,'domicile_state','=','text',NULL,'Karnataka',NULL,'Karnataka residence is required.'),
('K10',2,'age','>=','numeric',18,NULL,NULL,'Applicant must be at least 18.'),
('K10',2,'age','<=','numeric',55,NULL,NULL,'Applicant must be no older than 55.'),
('K10',1,'social_category','NOT IN','text',NULL,'SC,ST',NULL,'This group is for General/Special applicants outside SC/ST.'),
('K10',1,'annual_family_income','<','numeric',150000,NULL,NULL,'General/Special category income must be below Rs.150000.'),
('K10',2,'social_category','IN','text',NULL,'SC,ST',NULL,'This group is for SC/ST applicants.'),
('K10',2,'annual_family_income','<','numeric',200000,NULL,NULL,'SC/ST category income must be below Rs.200000.'),
('K09',1,'annual_family_income','<=','numeric',600000,NULL,NULL,'Family income must not exceed Rs.600000 per the verified KMDC page.');

INSERT INTO eligibility_rules(group_id,attribute_name,operator,value_type,
    numeric_value,text_value,boolean_value,failure_message)
SELECT g.group_id,p.attribute_name,p.operator,p.value_type,
       p.numeric_value,p.text_value,p.boolean_value,p.message
FROM patch05_rules p JOIN schemes s ON s.scheme_code=p.code
JOIN eligibility_rule_groups g ON g.scheme_id=s.scheme_id AND g.group_order=p.ord
ON CONFLICT(group_id,attribute_name,operator) DO UPDATE SET
    value_type=EXCLUDED.value_type, numeric_value=EXCLUDED.numeric_value,
    text_value=EXCLUDED.text_value, boolean_value=EXCLUDED.boolean_value,
    failure_message=EXCLUDED.failure_message;

-- 5. K07 is leather/footwear training. Keep Skill Training and replace only
-- the incorrect Handloom Support association with its broader artisan category.
INSERT INTO scheme_categories(scheme_id,category_id)
SELECT s.scheme_id,c.category_id FROM schemes s CROSS JOIN categories c
WHERE s.scheme_code='K07' AND c.category_name='Artisan & Handloom'
ON CONFLICT DO NOTHING;
DELETE FROM scheme_categories sc USING schemes s,categories c
WHERE sc.scheme_id=s.scheme_id AND sc.category_id=c.category_id
  AND s.scheme_code='K07' AND c.category_name='Handloom Support';

-- 6. Incomplete rule sets cannot support authoritative cached eligibility.
-- Preserve application status (including approved), timestamps of application,
-- and historical status logs. Evaluation must be rerun with the new evidence.
UPDATE applications a SET eligibility_result='needs_review',
    eligibility_reason='Rule set requires full policy review; re-evaluate with verified evidence after migration 05.',
    eligibility_checked_at=NULL, updated_at=CURRENT_TIMESTAMP
FROM schemes s WHERE a.scheme_id=s.scheme_id
AND s.eligibility_rules_complete=FALSE
AND a.eligibility_result IS NOT NULL;

-- Ensure no scheme rows, names, URLs, benefits or verification flags changed.
DO $$
BEGIN
 IF EXISTS (
   (SELECT * FROM patch05_schemes_before EXCEPT
    SELECT scheme_id,scheme_code,scheme_name,source_url,application_url,
           benefit_summary,verification_status FROM schemes)
   UNION ALL
   (SELECT scheme_id,scheme_code,scheme_name,source_url,application_url,
           benefit_summary,verification_status FROM schemes EXCEPT
    SELECT * FROM patch05_schemes_before)
 ) THEN RAISE EXCEPTION 'Unexpected scheme-data change: rolling back'; END IF;
END $$;
COMMIT;
