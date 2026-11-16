
-- 03_seed_data.sql
-- Government / State Scheme Eligibility Finder
-- Run after 02_tables_constraints.sql.
-- Target database: scheme_finder
--
-- IMPORTANT:
-- 1. Uses 15 national schemes (N01-N15) and 10 Karnataka schemes (K01-K10).
-- 2. Demo users and profiles are synthetic.
-- 3. Password values are placeholders, NOT usable password hashes.
-- 4. Exact application windows were not supplied. 'open' is a DEMO status,
--    not confirmation that an application portal is currently accepting forms.
-- 5. Some eligibility details need current official verification.
-- 6. Vector embeddings are intentionally deferred until real 384-D vectors
--    are generated.
--
-- This script is designed to be safely rerun without duplicating seed rows.

BEGIN;
SET LOCAL search_path = public;

-- =========================================================
-- 1. ROLES
-- =========================================================

INSERT INTO roles (role_name, description) VALUES
('admin', 'Demo administrator'),
('student', 'Student checking eligibility and tracking applications'),
('officer', 'Demo scheme/application review officer')
ON CONFLICT (role_name) DO NOTHING;

-- =========================================================
-- 2. SYNTHETIC USERS
-- =========================================================

INSERT INTO users (role_id, full_name, email, password_hash, is_active)
SELECT r.role_id, v.full_name, v.email,
       'DEMO_ONLY_NOT_A_REAL_HASH', TRUE
FROM (VALUES
    ('Scheme Finder Admin', 'admin@schemefinder.example', 'admin'),
    ('Scheme Review Officer', 'officer@schemefinder.example', 'officer'),
    ('Ananya Rao', 'ananya.rao@example.com', 'student'),
    ('Rahul Kumar', 'rahul.kumar@example.com', 'student'),
    ('Aisha Khan', 'aisha.khan@example.com', 'student'),
    ('Kavya Hegde', 'kavya.hegde@example.com', 'student'),
    ('Manjunath Gowda', 'manjunath.gowda@example.com', 'student'),
    ('Arjun Patil', 'arjun.patil@example.com', 'student'),
    ('Lakshmi Nayak', 'lakshmi.nayak@example.com', 'student')
) AS v(full_name, email, role_name)
JOIN roles r ON r.role_name = v.role_name
WHERE TRUE
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- 3. SYNTHETIC USER PROFILES
-- Only fields useful for the demo eligibility rules are populated.
-- =========================================================

WITH p (
    email, date_of_birth, gender, domicile_state, district,
    residence_type, social_category, minority_status,
    disability_status, disability_percentage, annual_family_income,
    current_course, degree_level, year_of_study,
    institution_approval_body, marks_percentage, class_12_percentage,
    employment_status, unemployment_days, self_employed,
    artisan_status, weaver_status, training_status,
    parent_occupation, parent_service_status, parent_martyred_status,
    orphan_status, parental_death_covid, other_scholarship,
    currently_studying, hostel_available, distance_km, beneficiary_siblings
) AS (
    VALUES
    ('ananya.rao@example.com', DATE '2005-04-10', 'female',
     'Karnataka', 'Bengaluru Urban', 'urban', 'OBC', FALSE,
     FALSE, NULL, 180000, 'B.Tech Computer Science', 'undergraduate', 1,
     'AICTE', 88, 91, 'student', NULL, FALSE, FALSE, FALSE, FALSE,
     'state police', 'STATE_POLICE', FALSE, FALSE, FALSE, FALSE,
     TRUE, FALSE, 18, 1),

    ('rahul.kumar@example.com', DATE '2004-11-02', 'male',
     'Karnataka', 'Mysuru', 'rural', 'SC', FALSE,
     FALSE, NULL, 220000, 'B.A. Economics', 'undergraduate', 2,
     'UGC', 78, 86, 'student', NULL, FALSE, FALSE, FALSE, FALSE,
     'agriculture', NULL, FALSE, FALSE, FALSE, FALSE,
     TRUE, FALSE, 8, 0),

    ('aisha.khan@example.com', DATE '2005-08-19', 'female',
     'Karnataka', 'Bengaluru Urban', 'urban', 'OBC', TRUE,
     FALSE, NULL, 300000, 'BCA', 'undergraduate', 1,
     'UGC', 82, 89, 'student', NULL, FALSE, FALSE, FALSE, FALSE,
     'small business', NULL, FALSE, FALSE, FALSE, FALSE,
     TRUE, FALSE, 12, 1),

    ('kavya.hegde@example.com', DATE '2005-01-25', 'female',
     'Karnataka', 'Dharwad', 'semi_urban', 'General', FALSE,
     TRUE, 45, 500000, 'B.E. Information Science', 'undergraduate', 1,
     'AICTE', 84, 87, 'student', NULL, FALSE, FALSE, FALSE, FALSE,
     'service', NULL, FALSE, FALSE, FALSE, FALSE,
     TRUE, FALSE, 6, 1),

    ('manjunath.gowda@example.com', DATE '1998-06-15', 'male',
     'Karnataka', 'Belagavi', 'rural', 'SC', FALSE,
     FALSE, NULL, 280000, 'Leather artisan training', 'PUC', NULL,
     'LIDKAR', 70, 72, 'artisan', NULL, TRUE, TRUE, TRUE, TRUE,
     'handloom weaver', 'WEAVER', FALSE, FALSE, FALSE, FALSE,
     FALSE, FALSE, 6, 2),

    ('arjun.patil@example.com', DATE '2001-12-08', 'male',
     'Karnataka', 'Kalaburagi', 'urban', 'General', FALSE,
     FALSE, NULL, 200000, 'B.Com', 'graduate', NULL,
     'UGC', 72, 75, 'unemployed', 210, FALSE, FALSE, FALSE, FALSE,
     'private service', NULL, FALSE, FALSE, FALSE, FALSE,
     FALSE, FALSE, 4, 0),

    ('lakshmi.nayak@example.com', DATE '2004-03-12', 'female',
     'Karnataka', 'Kodagu', 'rural', 'ST', TRUE,
     FALSE, NULL, 150000, 'PUC', 'PUC', 2,
     'State Board', 76, 78, 'student', NULL, FALSE, FALSE, FALSE, FALSE,
     'agriculture', NULL, FALSE, FALSE, FALSE, FALSE,
     TRUE, FALSE, 14, 1)
)
INSERT INTO user_profiles (
    user_id, date_of_birth, gender, domicile_state, district,
    residence_type, social_category, minority_status,
    disability_status, disability_percentage, annual_family_income,
    current_course, degree_level, year_of_study,
    institution_approval_body, marks_percentage, class_12_percentage,
    employment_status, unemployment_days, self_employed,
    artisan_status, weaver_status, training_status,
    parent_occupation, parent_service_status, parent_martyred_status,
    orphan_status, parental_death_covid, other_scholarship,
    currently_studying, hostel_available, distance_km, beneficiary_siblings
)
SELECT u.user_id, p.date_of_birth, p.gender, p.domicile_state, p.district,
       p.residence_type, p.social_category, p.minority_status,
       p.disability_status, p.disability_percentage, p.annual_family_income,
       p.current_course, p.degree_level, p.year_of_study,
       p.institution_approval_body, p.marks_percentage, p.class_12_percentage,
       p.employment_status, p.unemployment_days, p.self_employed,
       p.artisan_status, p.weaver_status, p.training_status,
       p.parent_occupation, p.parent_service_status, p.parent_martyred_status,
       p.orphan_status, p.parental_death_covid, p.other_scholarship,
       p.currently_studying, p.hostel_available, p.distance_km,
       p.beneficiary_siblings
FROM p
JOIN users u ON u.email = p.email
WHERE TRUE
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================
-- 4. SCHEMES
-- Exact start/deadline dates are left NULL because they were not
-- provided in the supplied scheme list.
-- =========================================================

INSERT INTO schemes (
    scheme_code, scheme_name, government_level, state_name,
    department, scheme_type, description, benefit_summary,
    application_mode, application_url, source_url, academic_year,
    scheme_status, verification_status, is_active
) VALUES
('N01', 'PM Scholarship — Wards of State/UT Police Personnel Martyred in Terror/Naxal Attacks',
 'national', NULL, 'Ministry of Home Affairs', 'Scholarship',
 'For eligible wards of State/UT police personnel martyred in terror or Naxal attacks.',
 'Girls ₹3,000/month; boys ₹2,500/month; up to 5 years.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N02', 'PM Scholarship — CAPF & Assam Rifles',
 'national', NULL, 'Ministry of Home Affairs', 'Scholarship',
 'For eligible wards/widows in the listed CAPF and Assam Rifles categories.',
 'Girls ₹3,000/month; boys ₹2,500/month.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N03', 'AICTE Swanath Scholarship',
 'national', NULL, 'AICTE', 'Scholarship',
 'For eligible AICTE students who meet the listed orphan, COVID-related parent-death or martyr-family conditions.',
 '₹50,000/year.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N04', 'AICTE Pragati — Girl Students, Technical Degree',
 'national', NULL, 'AICTE', 'Scholarship',
 'For eligible female students in the first year or eligible lateral-entry year of an AICTE technical degree.',
 '₹50,000/year; up to 4 years, or 3 years for lateral entry.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N05', 'AICTE Saksham — Specially-Abled, Technical Degree',
 'national', NULL, 'AICTE', 'Scholarship',
 'For eligible students with benchmark disability in an AICTE-approved technical course.',
 '₹50,000/year.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N06', 'Financial Assistance to Wards of Beedi/Cine/IOMC/LSDM Workers — Post Matric',
 'national', NULL, 'Ministry of Labour and Employment', 'Scholarship',
 'Post-matric assistance for eligible wards of listed worker categories; limits vary by worker category.',
 '₹3,000–₹25,000/year depending on course; professional-degree amount listed as ₹25,000.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N07', 'PM-YASASVI Top Class College — OBC/EBC/DNT',
 'national', NULL, 'Ministry of Social Justice and Empowerment', 'Scholarship',
 'For eligible OBC/EBC/DNT students studying full-time after Class XII at a notified institution.',
 'Tuition/non-refundable charges, ₹3,000/month living allowance, books and laptop support up to ₹45,000.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N08', 'National Renewable Energy Fellowship Scheme',
 'national', NULL, 'Ministry of New and Renewable Energy', 'Fellowship',
 'For eligible renewable-energy-related programmes or research, subject to merit and current programme conditions.',
 'Fellowship/research support; exact current amount requires verification.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'needs_review', TRUE),

('N09', 'Stipend Scheme for UG/PG Studies in Indian Statistical Institute, Kolkata',
 'national', NULL, 'Indian Statistical Institute, Kolkata', 'Stipend',
 'For eligible ISI programmes, subject to academic, performance and attendance conditions.',
 'Programme-specific stipend/contingency; exact current rates require verification.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'needs_review', TRUE),

('N10', 'ICAR National Talent Scholarship — NTS-UG',
 'national', NULL, 'Indian Council of Agricultural Research', 'Scholarship',
 'Associated with eligible ICAR undergraduate admission and merit under current ICAR guidelines.',
 'Scholarship attached to eligible ICAR UG admission; current amount requires verification.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'needs_review', TRUE),

('N11', 'ICAR Post Graduate Scholarship — PGS',
 'national', NULL, 'Indian Council of Agricultural Research', 'Scholarship',
 'For eligible ICAR postgraduate admission, merit and agricultural-discipline conditions.',
 'Programme/subject-specific; current amount requires verification.',
 'online', NULL, 'https://scholarships.gov.in/', '2026-27', 'open', 'needs_review', TRUE),

('N12', 'Central Sector Scholarship of Top Class Education for SC Students',
 'national', NULL, 'Ministry of Social Justice and Empowerment', 'Scholarship',
 'For eligible SC students studying beyond Class XII at an empanelled institution.',
 'Full financial support subject to scheme ceilings.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N13', 'Post-Matric Scholarship for Students with Disabilities',
 'national', NULL, 'Department of Empowerment of Persons with Disabilities', 'Scholarship',
 'Post-matric support for eligible students with disabilities; amounts vary by course, hosteller status and other conditions.',
 'Maintenance/disability-related allowances and book allowance; amount varies.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'needs_review', TRUE),

('N14', 'PM-USP Central Sector Scholarship for College & University Students',
 'national', NULL, 'Ministry of Education', 'Scholarship',
 'For eligible college/university students subject to Class XII, income, renewal and other conditions.',
 '₹12,000/year for first 3 UG years; ₹20,000/year for PG and later professional years as applicable.',
 'online', NULL, 'https://www.myscheme.gov.in/', '2026-27', 'open', 'verified', TRUE),

('N15', 'National Fellowship & Scholarship for Higher Education of ST Students — Scholarship Component',
 'national', NULL, 'Ministry of Tribal Affairs', 'Scholarship',
 'For eligible ST students in listed institutions, subject to current income and course conditions.',
 'Tuition, living, books and computer support.',
 'online', NULL, 'https://tribal.nic.in/', '2026-27', 'open', 'verified', TRUE),

('K01', 'Vidyasiri — Minority Welfare, Karnataka',
 'state', 'Karnataka', 'Karnataka Minority Welfare Department', 'Scholarship',
 'For eligible Karnataka minority students in post-matric/PUC through PhD study. Latest circular should be rechecked.',
 'Supplied sheet lists ₹1,500/month for 10 months; confirm current circular.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K02', 'Overseas Educational Loan Scheme — Karnataka Minorities Development Corporation',
 'state', 'Karnataka', 'Karnataka Minorities Development Corporation', 'Education loan',
 'For eligible Karnataka minority applicants admitted to a recognized foreign university; terms depend on income band.',
 'Loan up to ₹20 lakh in the lower-income band; other bands differ.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K03', 'Stipend to Law Graduates — Social Welfare, Karnataka',
 'state', 'Karnataka', 'Karnataka Social Welfare Department', 'Stipend',
 'For eligible Karnataka resident SC/ST law graduates undertaking supervised legal training.',
 'Monthly stipend; amount left unspecified pending confirmation.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K04', 'Chief Minister''s Kaushalya Karnataka Yojane (CMKKY)',
 'state', 'Karnataka', 'Karnataka skill-development programmes', 'Skill development',
 'Skill-development training for eligible youth; course-level conditions vary by programme.',
 'Free or assisted skill-development training through state programmes.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K05', 'Yuvanidhi',
 'state', 'Karnataka', 'Government of Karnataka', 'Unemployment assistance',
 'For eligible Karnataka graduates/diploma holders meeting domicile/study and unemployment-duration conditions.',
 '₹3,000/month for graduates; ₹1,500/month for diploma holders, until employed or up to 2 years.',
 'online', NULL, 'https://sevasindhu.karnataka.gov.in/', NULL, 'open', 'verified', TRUE),

('K06', 'Skill Development Training Karnataka — Social Welfare/LIDKAR',
 'state', 'Karnataka', 'Karnataka Social Welfare Department / LIDKAR', 'Skill development',
 'Training support for eligible leather artisans in listed SC sub-castes; age, income and occupation conditions apply.',
 '60-day training, ₹6,000 stipend and leather-stitching machine/toolkit as listed.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'verified', TRUE),

('K07', 'Skill Upgradation Programme Karnataka — LIDKAR',
 'state', 'Karnataka', 'LIDKAR', 'Skill development',
 'Advanced leather/footwear/design training for eligible artisan-community youth; course details require confirmation.',
 'Advanced training at institutions such as CFTI/CLRI/KILT; current stipend/selection rules require confirmation.',
 'unknown', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K08', 'Kaimagga Vikasa Yojana — Handloom & Textiles',
 'state', 'Karnataka', 'Karnataka Handloom and Textiles', 'Artisan assistance',
 'For eligible traditional weavers or recognized trainees, subject to weaver ID and other conditions.',
 'Subsidy of 50% of unit cost of eligible handloom/equipment.',
 'offline', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'verified', TRUE),

('K09', 'Shrama Shakthi Scheme — Karnataka Minorities',
 'state', 'Karnataka', 'Karnataka Minorities Development Corporation', 'Loan',
 'For eligible Karnataka residents from religious minority communities aged 18–55 within the stated income ceiling.',
 '₹50,000 loan at 4% interest, repayable in 36 instalments.',
 'online', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE),

('K10', 'Udyogini — Karnataka State Women''s Development Corporation',
 'state', 'Karnataka', 'Karnataka State Women''s Development Corporation', 'Self-employment loan',
 'Bank-linked self-employment loan and category-based subsidy for eligible Karnataka resident women.',
 'Bank-linked self-employment loan plus category-based subsidy; current numeric terms require rechecking.',
 'both', NULL, 'https://www.myscheme.gov.in/', NULL, 'open', 'needs_review', TRUE)

ON CONFLICT (scheme_code) DO NOTHING;

-- =========================================================
-- 5. CATEGORIES
-- =========================================================

INSERT INTO categories (category_name, parent_category_id, description) VALUES
('Education', NULL, 'Education and study-related schemes.'),
('Financial Assistance', NULL, 'Loans, stipends and other financial support.'),
('Community Welfare', NULL, 'Schemes with community-related eligibility criteria.'),
('Employment & Skills', NULL, 'Employment assistance and skill development.'),
('Artisan & Handloom', NULL, 'Artisan, weaver and handloom support.'),
('Women Empowerment', NULL, 'Women-focused schemes and livelihood support.')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO categories (category_name, parent_category_id, description)
SELECT v.category_name, p.category_id, v.description
FROM (VALUES
    ('Scholarships', 'Education', 'Scholarship and fee-support programmes.'),
    ('Technical Education', 'Education', 'Technical and AICTE-linked schemes.'),
    ('Fellowships & Research', 'Education', 'Fellowship and research support.'),
    ('Minority Welfare', 'Community Welfare', 'Schemes with minority-community criteria.'),
    ('SC/ST Support', 'Community Welfare', 'Schemes with SC/ST criteria.'),
    ('Disability Support', 'Community Welfare', 'Schemes with disability-related criteria.'),
    ('Loans', 'Financial Assistance', 'Education, enterprise and other loans.'),
    ('Skill Training', 'Employment & Skills', 'Skill development and training.'),
    ('Unemployment Support', 'Employment & Skills', 'Unemployment-related support.'),
    ('Self Employment', 'Employment & Skills', 'Self-employment and enterprise support.'),
    ('Handloom Support', 'Artisan & Handloom', 'Weaver and handloom assistance.')
) AS v(category_name, parent_name, description)
JOIN categories p ON p.category_name = v.parent_name
ON CONFLICT (category_name) DO NOTHING;

-- =========================================================
-- 6. SCHEME/CATEGORY LINKS
-- =========================================================

INSERT INTO scheme_categories (scheme_id, category_id)
SELECT s.scheme_id, c.category_id
FROM (VALUES
    ('N01','Scholarships'), ('N01','Community Welfare'),
    ('N02','Scholarships'), ('N02','Community Welfare'),
    ('N03','Scholarships'), ('N03','Education'),
    ('N04','Scholarships'), ('N04','Technical Education'),
    ('N05','Scholarships'), ('N05','Technical Education'), ('N05','Disability Support'),
    ('N06','Scholarships'), ('N06','Community Welfare'),
    ('N07','Scholarships'), ('N07','Community Welfare'),
    ('N08','Fellowships & Research'), ('N09','Fellowships & Research'),
    ('N10','Scholarships'), ('N11','Scholarships'),
    ('N12','Scholarships'), ('N12','SC/ST Support'),
    ('N13','Scholarships'), ('N13','Disability Support'),
    ('N14','Scholarships'),
    ('N15','Scholarships'), ('N15','SC/ST Support'),
    ('K01','Scholarships'), ('K01','Minority Welfare'),
    ('K02','Loans'), ('K02','Minority Welfare'),
    ('K03','Education'), ('K03','Community Welfare'),
    ('K04','Skill Training'),
    ('K05','Unemployment Support'),
    ('K06','Skill Training'), ('K06','SC/ST Support'),
    ('K07','Skill Training'), ('K07','Handloom Support'),
    ('K08','Handloom Support'), ('K08','Financial Assistance'),
    ('K09','Loans'), ('K09','Minority Welfare'),
    ('K10','Self Employment'), ('K10','Women Empowerment')
) AS v(scheme_code, category_name)
JOIN schemes s ON s.scheme_code = v.scheme_code
JOIN categories c ON c.category_name = v.category_name
ON CONFLICT (scheme_id, category_id) DO NOTHING;

-- =========================================================
-- 7. ELIGIBILITY RULES
-- Rules within a group are ANDed. Different groups for a scheme
-- represent alternative eligibility paths (OR).
--
-- Values like "CAPF,ASSAM_RIFLES" for IN are comma-separated lists.
-- Some detailed conditions in the PDF cannot be represented by the
-- current profile columns, so they are documented but not invented here.
-- =========================================================

CREATE TEMP TABLE seed_rule_data (
    scheme_code VARCHAR(50) NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    group_order INTEGER NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL,
    value_type VARCHAR(20) NOT NULL,
    numeric_value NUMERIC(14,2),
    text_value TEXT,
    boolean_value BOOLEAN,
    failure_message TEXT
) ON COMMIT DROP;

INSERT INTO seed_rule_data VALUES
-- N01: State/UT police personnel scholarship
('N01','Fresh applicant',1,'parent_service_status','=','text',NULL,'STATE_POLICE',NULL,'Parent service category must match.'),
('N01','Fresh applicant',1,'parent_martyred_status','=', 'boolean',NULL,NULL,TRUE,'Parent must meet the listed martyr condition.'),
('N01','Fresh applicant',1,'marks_percentage','>=','numeric',60,NULL,NULL,'Entry marks must be at least 60%.'),
('N01','Renewal',2,'parent_service_status','=','text',NULL,'STATE_POLICE',NULL,'Parent service category must match.'),
('N01','Renewal',2,'parent_martyred_status','=', 'boolean',NULL,NULL,TRUE,'Parent must meet the listed martyr condition.'),
('N01','Renewal',2,'marks_percentage','>=','numeric',50,NULL,NULL,'Renewal marks must be at least 50%.'),

-- N02: CAPF and Assam Rifles
('N02','CAPF/Assam Rifles category',1,'parent_service_status','IN','text',NULL,'CAPF,ASSAM_RIFLES',NULL,'Parent service must match an eligible category.'),
('N02','CAPF/Assam Rifles category',1,'marks_percentage','>=','numeric',60,NULL,NULL,'Entry marks must be at least 60%.'),

-- N03: alternative eligibility categories, with shared conditions repeated
('N03','Orphan category',1,'orphan_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the orphan category.'),
('N03','Orphan category',1,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),
('N03','Orphan category',1,'other_scholarship','=','boolean',NULL,NULL,FALSE,'Applicant must not receive another government/AICTE scholarship.'),
('N03','COVID-related parent death',2,'parental_death_covid','=','boolean',NULL,NULL,TRUE,'Applicant must meet the COVID-related parent-death category.'),
('N03','COVID-related parent death',2,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),
('N03','COVID-related parent death',2,'other_scholarship','=','boolean',NULL,NULL,FALSE,'Applicant must not receive another government/AICTE scholarship.'),
('N03','Martyr-family category',3,'parent_martyred_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the eligible martyr-family category.'),
('N03','Martyr-family category',3,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),
('N03','Martyr-family category',3,'other_scholarship','=','boolean',NULL,NULL,FALSE,'Applicant must not receive another government/AICTE scholarship.'),

-- N04: AICTE Pragati
('N04','First year',1,'gender','=','text',NULL,'female',NULL,'Scheme is for female students.'),
('N04','First year',1,'year_of_study','=','numeric',1,NULL,NULL,'Applicant must be in the first year.'),
('N04','First year',1,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),
('N04','Lateral entry',2,'gender','=','text',NULL,'female',NULL,'Scheme is for female students.'),
('N04','Lateral entry',2,'year_of_study','=','numeric',2,NULL,NULL,'Applicant must meet the lateral-entry year condition.'),
('N04','Lateral entry',2,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),

-- N05: AICTE Saksham
('N05','First year',1,'disability_status','=','boolean',NULL,NULL,TRUE,'Disability status must be recorded.'),
('N05','First year',1,'disability_percentage','>=','numeric',40,NULL,NULL,'Disability percentage must be at least 40%.'),
('N05','First year',1,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),
('N05','Lateral entry',2,'disability_status','=','boolean',NULL,NULL,TRUE,'Disability status must be recorded.'),
('N05','Lateral entry',2,'disability_percentage','>=','numeric',40,NULL,NULL,'Disability percentage must be at least 40%.'),
('N05','Lateral entry',2,'annual_family_income','<=','numeric',800000,NULL,NULL,'Annual family income must not exceed ₹8,00,000.'),

-- N06: Beedi/Cine/IOMC/LSDM workers
('N06','Worker ward',1,'parent_occupation','IN','text',NULL,'beedi,cine,IOMC,LSDM',NULL,'Parent occupation must match a listed worker category.'),
('N06','Worker ward',1,'currently_studying','=','boolean',NULL,NULL,TRUE,'Applicant must be studying in an eligible course.'),

-- N07: PM-YASASVI
('N07','Top-class college',1,'social_category','IN','text',NULL,'OBC,EBC,DNT',NULL,'Applicant must belong to an eligible category.'),
('N07','Top-class college',1,'annual_family_income','<=','numeric',250000,NULL,NULL,'Annual family income must not exceed ₹2,50,000.'),
('N07','Top-class college',1,'beneficiary_siblings','<','numeric',2,NULL,NULL,'Sibling limit must be checked against current scheme rules.'),

-- N08: Renewable energy fellowship
('N08','Renewable-energy programme',1,'current_course','=','text',NULL,'renewable_energy_related',NULL,'Programme/research must be renewable-energy-related.'),

-- N09: ISI
('N09','ISI programme',1,'current_course','=','text',NULL,'ISI_programme',NULL,'Applicant must match an eligible ISI programme.'),
('N09','ISI programme',1,'currently_studying','=','boolean',NULL,NULL,TRUE,'Applicant must be studying.'),

-- N10 and N11: ICAR
('N10','ICAR UG',1,'current_course','=','text',NULL,'ICAR_UG',NULL,'Applicant must match eligible ICAR UG admission.'),
('N11','ICAR PG',1,'current_course','=','text',NULL,'ICAR_PG',NULL,'Applicant must match eligible ICAR PG admission.'),

-- N12: Top Class Education for SC Students
('N12','SC higher education',1,'social_category','=','text',NULL,'SC',NULL,'Applicant must belong to the SC category.'),

-- N13: Post-matric disability
('N13','Post-matric disability',1,'disability_status','=','boolean',NULL,NULL,TRUE,'Disability status must be recorded.'),
('N13','Post-matric disability',1,'disability_percentage','>=','numeric',40,NULL,NULL,'Disability percentage must be at least 40%.'),
('N13','Post-matric disability',1,'currently_studying','=','boolean',NULL,NULL,TRUE,'Applicant must be studying.'),

-- N14: PM-USP fresh and renewal paths
('N14','Fresh applicant',1,'class_12_percentage','>','numeric',80,NULL,NULL,'Class XII result must exceed the threshold stated in the supplied sheet.'),
('N14','Fresh applicant',1,'annual_family_income','<=','numeric',450000,NULL,NULL,'Annual family income must not exceed ₹4,50,000.'),
('N14','Renewal',2,'marks_percentage','>=','numeric',50,NULL,NULL,'Renewal marks must be at least 50%.'),
('N14','Renewal',2,'annual_family_income','<=','numeric',450000,NULL,NULL,'Annual family income must not exceed ₹4,50,000.'),

-- N15: ST higher education
('N15','ST higher education',1,'social_category','=','text',NULL,'ST',NULL,'Applicant must belong to the ST category.'),
('N15','ST higher education',1,'annual_family_income','<=','numeric',600000,NULL,NULL,'Annual family income must not exceed ₹6,00,000.'),

-- K01: Vidyasiri alternatives
('K01','Rural residence',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka domicile.'),
('K01','Rural residence',1,'minority_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the minority condition.'),
('K01','Rural residence',1,'residence_type','=','text',NULL,'rural',NULL,'Applicant must meet the rural-residence alternative.'),
('K01','Rural residence',1,'hostel_available','=','boolean',NULL,NULL,FALSE,'Applicant must meet the no-hostel condition.'),
('K01','Distance criterion',2,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka domicile.'),
('K01','Distance criterion',2,'minority_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the minority condition.'),
('K01','Distance criterion',2,'distance_km','>=','numeric',5,NULL,NULL,'Current distance threshold needs confirmation.'),
('K01','Distance criterion',2,'hostel_available','=','boolean',NULL,NULL,FALSE,'Applicant must meet the no-hostel condition.'),

-- K02: Overseas education loan
('K02','Overseas education loan',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka resident.'),
('K02','Overseas education loan',1,'minority_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the minority condition.'),

-- K03: Law graduate stipend; SC and ST are alternative groups
('K03','SC law graduate',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka resident.'),
('K03','SC law graduate',1,'social_category','=','text',NULL,'SC',NULL,'Applicant must meet the SC category condition.'),
('K03','SC law graduate',1,'degree_level','=','text',NULL,'law_graduate',NULL,'Applicant must be a law graduate.'),
('K03','ST law graduate',2,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka resident.'),
('K03','ST law graduate',2,'social_category','=','text',NULL,'ST',NULL,'Applicant must meet the ST category condition.'),
('K03','ST law graduate',2,'degree_level','=','text',NULL,'law_graduate',NULL,'Applicant must be a law graduate.'),

-- K04: CMKKY
('K04','Karnataka skill training',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must meet Karnataka programme conditions.'),
('K04','Karnataka skill training',1,'training_status','=','boolean',NULL,NULL,TRUE,'Applicant must match the selected training programme.'),

-- K05: Yuvanidhi graduate/diploma paths
('K05','Graduate',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must meet Karnataka domicile/study conditions.'),
('K05','Graduate',1,'degree_level','=','text',NULL,'graduate',NULL,'Applicant must hold the relevant graduate qualification.'),
('K05','Graduate',1,'employment_status','=','text',NULL,'unemployed',NULL,'Applicant must be unemployed.'),
('K05','Graduate',1,'unemployment_days','>=','numeric',180,NULL,NULL,'Unemployment duration must be at least 180 days.'),
('K05','Graduate',1,'self_employed','=','boolean',NULL,NULL,FALSE,'Self-employed applicants are excluded.'),
('K05','Diploma holder',2,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must meet Karnataka domicile/study conditions.'),
('K05','Diploma holder',2,'degree_level','=','text',NULL,'diploma',NULL,'Applicant must hold the relevant diploma qualification.'),
('K05','Diploma holder',2,'employment_status','=','text',NULL,'unemployed',NULL,'Applicant must be unemployed.'),
('K05','Diploma holder',2,'unemployment_days','>=','numeric',180,NULL,NULL,'Unemployment duration must be at least 180 days.'),
('K05','Diploma holder',2,'self_employed','=','boolean',NULL,NULL,FALSE,'Self-employed applicants are excluded.'),

-- K06 and K07: artisan skill schemes
('K06','Leather artisan training',1,'social_category','=','text',NULL,'SC',NULL,'Applicant must meet the listed SC sub-caste condition.'),
('K06','Leather artisan training',1,'artisan_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the leather-artisan condition.'),
('K07','Artisan skill upgradation',1,'artisan_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the artisan-community condition.'),

-- K08: traditional weaver or recognized training
('K08','Traditional weaver',1,'weaver_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the traditional-weaver condition.'),
('K08','Recognized training',2,'training_status','=','boolean',NULL,NULL,TRUE,'Applicant must meet the recognized-training alternative.'),

-- K09: Shrama Shakthi
('K09','Minority enterprise loan',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka resident.'),
('K09','Minority enterprise loan',1,'minority_status','=','boolean',NULL,NULL,TRUE,'Applicant must belong to a religious minority community.'),
('K09','Minority enterprise loan',1,'age','>=','numeric',18,NULL,NULL,'Applicant must be at least 18 years old.'),
('K09','Minority enterprise loan',1,'age','<=','numeric',55,NULL,NULL,'Applicant must be no older than 55.'),
('K09','Minority enterprise loan',1,'annual_family_income','<=','numeric',350000,NULL,NULL,'Annual family income must not exceed ₹3,50,000.'),

-- K10: Udyogini
('K10','Women self-employment',1,'gender','=','text',NULL,'female',NULL,'Applicant must be a woman.'),
('K10','Women self-employment',1,'domicile_state','=','text',NULL,'Karnataka',NULL,'Applicant must be a Karnataka resident.');

INSERT INTO eligibility_rule_groups (scheme_id, group_name, group_order, is_active)
SELECT DISTINCT s.scheme_id, d.group_name, d.group_order, TRUE
FROM seed_rule_data d
JOIN schemes s ON s.scheme_code = d.scheme_code
ON CONFLICT (scheme_id, group_order) DO NOTHING;

INSERT INTO eligibility_rules (
    group_id, attribute_name, operator, value_type,
    numeric_value, text_value, boolean_value, failure_message
)
SELECT g.group_id, d.attribute_name, d.operator, d.value_type,
       d.numeric_value, d.text_value, d.boolean_value, d.failure_message
FROM seed_rule_data d
JOIN schemes s ON s.scheme_code = d.scheme_code
JOIN eligibility_rule_groups g
  ON g.scheme_id = s.scheme_id AND g.group_order = d.group_order
WHERE NOT EXISTS (
    SELECT 1
    FROM eligibility_rules er
    WHERE er.group_id = g.group_id
      AND er.attribute_name = d.attribute_name
      AND er.operator = d.operator
      AND er.value_type = d.value_type
      AND er.numeric_value IS NOT DISTINCT FROM d.numeric_value
      AND er.text_value IS NOT DISTINCT FROM d.text_value
      AND er.boolean_value IS NOT DISTINCT FROM d.boolean_value
);

-- =========================================================
-- 8. REQUIRED DOCUMENTS
-- These are starter checklists from the supplied scheme sheet.
-- Confirm current official checklists before real-world use.
-- =========================================================

INSERT INTO scheme_documents (scheme_id, document_name, is_mandatory, notes)
SELECT s.scheme_id, d.document_name, d.is_mandatory, d.notes
FROM (VALUES
    ('N01','Service and martyr proof',TRUE,'As listed in the supplied sheet.'),
    ('N01','Academic records and bank details',TRUE,'Academic and disbursement proof.'),
    ('N02','Service certificate',TRUE,'CAPF/Assam Rifles category proof.'),
    ('N02','Marksheets, bank and Aadhaar details',TRUE,'As listed in the supplied sheet.'),
    ('N03','Category-specific death/martyr proof',TRUE,'Provide proof matching the claimed category.'),
    ('N03','Bona fide, marksheets and income/category certificates',TRUE,'As applicable.'),
    ('N04','10th/12th/diploma records',TRUE,'As applicable to entry route.'),
    ('N04','Income, Aadhaar, study certificate and bank details',TRUE,'As listed in the supplied sheet.'),
    ('N05','Disability certificate',TRUE,'Disability proof.'),
    ('N05','Academic, income, bona fide and Aadhaar documents',TRUE,'As listed in the supplied sheet.'),
    ('N06','Worker ID and income certificate',TRUE,'Proof of eligible worker category.'),
    ('N06','Previous examination marks',TRUE,'Academic proof.'),
    ('N07','Aadhaar, income, caste/community and domicile proof',TRUE,'Category and residence proof.'),
    ('N07','Marks/admission rank, fee proof and bank details',TRUE,'Admission and disbursement evidence.'),
    ('N08','Current NSP checklist and programme/research evidence',TRUE,'Check current scheme specification.'),
    ('N09','ISI academic and attendance/performance records',TRUE,'Programme-specific checklist.'),
    ('N10','ICAR admission/counselling documents',TRUE,'Check current ICAR guideline.'),
    ('N11','ICAR PG/admission documents',TRUE,'Check current ICAR guideline.'),
    ('N12','SC and income certificates',TRUE,'Current guideline may specify detailed financial rules.'),
    ('N12','Admission, academic and fee documents',TRUE,'Empanelled institution/admission proof.'),
    ('N13','Disability certificate/UDID',TRUE,'Disability proof.'),
    ('N13','Academic, institution, income and bank documents',TRUE,'Current checklist applies.'),
    ('N14','Class XII marks and income proof',TRUE,'Fresh application documents.'),
    ('N14','Previous-year marks',FALSE,'Renewal document.'),
    ('N15','ST and income certificates',TRUE,'As listed in the supplied sheet.'),
    ('N15','Admission, institution and academic documents',TRUE,'Eligible institution/course proof.'),
    ('K01','Domicile and minority/income proof',TRUE,'Check latest Karnataka circular.'),
    ('K01','Academic and institution records',TRUE,'As listed in the supplied sheet.'),
    ('K02','Minority/domicile/income documents',TRUE,'Current income bands need rechecking.'),
    ('K02','Admission offer, foreign-university and bank/loan documents',TRUE,'As applicable.'),
    ('K03','Caste/income RD-number proof',TRUE,'As listed in the supplied sheet.'),
    ('K03','Law degree and bank passbook',TRUE,'Proof for stipend processing.'),
    ('K04','Identity, education and programme registration',TRUE,'Course-specific checklist.'),
    ('K05','Degree/diploma proof and unemployment declaration',TRUE,'Qualification and unemployment proof.'),
    ('K05','Aadhaar-seeded bank details',TRUE,'As listed in the supplied sheet.'),
    ('K06','Aadhaar, caste, income and ration card',TRUE,'As listed in the supplied sheet.'),
    ('K06','Photos, e-Shram, bank and profession/skill certificate',TRUE,'As applicable.'),
    ('K07','Academic, caste/community and training documents',TRUE,'Course-specific checklist.'),
    ('K08','Weaver ID and training certificate',TRUE,'As applicable to the weaver route.'),
    ('K08','Financing/loan proof',FALSE,'Required for relevant equipment support.'),
    ('K09','Residence, minority/community, income and Aadhaar proof',TRUE,'Check current notification.'),
    ('K09','Project report, photo and bank details',TRUE,'As listed in the supplied sheet.'),
    ('K10','Identity, residence and applicable income/category proof',TRUE,'Check current notification.'),
    ('K10','Bank and project documents',TRUE,'Self-employment loan process.')
) AS d(scheme_code, document_name, is_mandatory, notes)
JOIN schemes s ON s.scheme_code = d.scheme_code
ON CONFLICT (scheme_id, document_name) DO NOTHING;

-- =========================================================
-- 9. SAMPLE APPLICATIONS
-- =========================================================

INSERT INTO applications (
    user_id, scheme_id, applied_at, current_status,
    eligibility_result, eligibility_reason, eligibility_checked_at
)
SELECT u.user_id, s.scheme_id, v.applied_at::timestamptz,
       v.current_status, v.eligibility_result, v.eligibility_reason,
       v.eligibility_checked_at::timestamptz
FROM (VALUES
    ('ananya.rao@example.com','N04','2026-08-02 10:30:00+05:30',
     'approved','eligible','Demo seed; verify official portal checklist.',
     '2026-08-02 10:00:00+05:30'),

    ('rahul.kumar@example.com','N12','2026-08-05 12:15:00+05:30',
     'submitted','eligible','Demo seed; institution-specific conditions still require checking.',
     '2026-08-05 12:00:00+05:30'),

    ('aisha.khan@example.com','K01','2026-08-08 09:00:00+05:30',
     'under_review','needs_review','Confirm the current Karnataka circular and hostel/distance conditions.',
     '2026-08-08 08:45:00+05:30'),

    ('kavya.hegde@example.com','N05','2026-08-10 11:20:00+05:30',
     'approved','eligible','Demo seed; official portal verification is still required.',
     '2026-08-10 11:00:00+05:30'),

    ('manjunath.gowda@example.com','K08','2026-08-12 14:00:00+05:30',
     'submitted','eligible','Demo seed; confirm the current district-level checklist.',
     '2026-08-12 13:45:00+05:30'),

    ('arjun.patil@example.com','K05',NULL,
     'draft',NULL,NULL,NULL)
) AS v(email, scheme_code, applied_at, current_status,
       eligibility_result, eligibility_reason, eligibility_checked_at)
JOIN users u ON u.email = v.email
JOIN schemes s ON s.scheme_code = v.scheme_code
WHERE TRUE
ON CONFLICT (user_id, scheme_id) DO NOTHING;

-- =========================================================
-- 10. APPLICATION STATUS HISTORY
-- =========================================================

INSERT INTO application_status_log (
    application_id, old_status, new_status, changed_at, changed_by, remarks
)
SELECT a.application_id, v.old_status, v.new_status,
       v.changed_at::timestamptz, actor.user_id, v.remarks
FROM (VALUES
    ('ananya.rao@example.com','N04','under_review','approved',
     '2026-08-03 10:00:00+05:30','officer@schemefinder.example',
     'Demo approval recorded for testing.'),

    ('rahul.kumar@example.com','N12','draft','submitted',
     '2026-08-05 12:15:00+05:30','officer@schemefinder.example',
     'Demo application submitted.'),

    ('aisha.khan@example.com','K01','submitted','under_review',
     '2026-08-09 09:30:00+05:30','officer@schemefinder.example',
     'Current circular and supporting documents need review.'),

    ('kavya.hegde@example.com','N05','under_review','approved',
     '2026-08-11 10:00:00+05:30','admin@schemefinder.example',
     'Demo approval recorded for testing.'),

    ('manjunath.gowda@example.com','K08','draft','submitted',
     '2026-08-12 14:00:00+05:30','officer@schemefinder.example',
     'Demo application submitted for review.')
) AS v(email, scheme_code, old_status, new_status,
       changed_at, changed_by_email, remarks)
JOIN users applicant ON applicant.email = v.email
JOIN schemes s ON s.scheme_code = v.scheme_code
JOIN applications a
  ON a.user_id = applicant.user_id AND a.scheme_id = s.scheme_id
JOIN users actor ON actor.email = v.changed_by_email
WHERE NOT EXISTS (
    SELECT 1
    FROM application_status_log l
    WHERE l.application_id = a.application_id
      AND l.new_status = v.new_status
      AND l.remarks = v.remarks
);

-- =========================================================
-- 11. VECTOR EMBEDDINGS
-- Intentionally not inserted here.
-- Generate real 384-dimensional vectors before inserting into
-- scheme_embeddings. Do not use fabricated/random vectors.
-- =========================================================

COMMIT;

-- =========================================================
-- 12. QUICK VALIDATION QUERIES
-- Run separately after this script if desired.
-- =========================================================

-- SELECT government_level, COUNT(*)
-- FROM schemes GROUP BY government_level ORDER BY government_level;
--
-- SELECT scheme_code, scheme_name, verification_status
-- FROM schemes ORDER BY scheme_code;
--
-- SELECT COUNT(*) AS users_count FROM users;
-- SELECT COUNT(*) AS profiles_count FROM user_profiles;
-- SELECT COUNT(*) AS rule_groups_count FROM eligibility_rule_groups;
-- SELECT COUNT(*) AS rules_count FROM eligibility_rules;
-- SELECT COUNT(*) AS documents_count FROM scheme_documents;
-- SELECT COUNT(*) AS applications_count FROM applications;
