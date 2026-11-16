import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          error: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const result = await withStudent(session.userId, (db) =>
      db.query(
      `
        SELECT
          profile_id,
          user_id,
          TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
          gender,
          domicile_state,
          district,
          residence_type,
          social_category,
          minority_status,
          disability_status,
          disability_percentage,
          annual_family_income,

          current_course,
          degree_level,
          year_of_study,
          institution_name,
          institution_approval_body,
          marks_percentage,
          cgpa,
          class_12_percentage,
          class_12_percentile,
          admission_entry_type,
          aicte_approved_degree,

          employment_status,
          unemployment_days,
          self_employed,
          artisan_status,
          weaver_status,
          training_status,

          parent_occupation,
          parent_service_status,
          parent_martyred_status,
          orphan_status,
          parental_death_covid,
          other_scholarship,

          currently_studying,
          hosteller,
          hostel_available,
          distance_km,
          beneficiary_siblings,

          created_at,
          updated_at
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [Number(session.userId)]
    )
    );

    if (result.rowCount === 0) {
      return Response.json({
        success: true,
        profile: null,
      });
    }

    return Response.json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Student profile GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load profile.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          error: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Convert empty strings from form inputs into NULL.
    function nullable(value) {
      if (value === "" || value === undefined) {
        return null;
      }

      return value;
    }

    function nullableNumber(value) {
      if (value === "" || value === undefined || value === null) {
        return null;
      }

      const number = Number(value);

      return Number.isFinite(number) ? number : null;
    }

    function nullableBoolean(value) {
      if (value === "" || value === undefined || value === null) {
        return null;
      }

      return value === true || value === "true";
    }

    const profile = {
      date_of_birth: nullable(body.date_of_birth),
      gender: nullable(body.gender),
      domicile_state: nullable(body.domicile_state),
      district: nullable(body.district),
      residence_type: nullable(body.residence_type),
      social_category: nullable(body.social_category),

      minority_status: nullableBoolean(body.minority_status),
      disability_status: nullableBoolean(body.disability_status),
      disability_percentage: nullableNumber(body.disability_percentage),
      annual_family_income: nullableNumber(body.annual_family_income),

      current_course: nullable(body.current_course),
      degree_level: nullable(body.degree_level),
      year_of_study: nullableNumber(body.year_of_study),
      institution_name: nullable(body.institution_name),
      institution_approval_body: nullable(body.institution_approval_body),

      marks_percentage: nullableNumber(body.marks_percentage),
      cgpa: nullableNumber(body.cgpa),
      class_12_percentage: nullableNumber(body.class_12_percentage),
      class_12_percentile: nullableNumber(body.class_12_percentile),

      admission_entry_type: nullable(body.admission_entry_type),
      aicte_approved_degree: nullableBoolean(body.aicte_approved_degree),

      employment_status: nullable(body.employment_status),
      unemployment_days: nullableNumber(body.unemployment_days),

      self_employed: nullableBoolean(body.self_employed),
      artisan_status: nullableBoolean(body.artisan_status),
      weaver_status: nullableBoolean(body.weaver_status),
      training_status: nullableBoolean(body.training_status),

      parent_occupation: nullable(body.parent_occupation),
      parent_service_status: nullable(body.parent_service_status),
      parent_martyred_status: nullableBoolean(body.parent_martyred_status),

      orphan_status: nullableBoolean(body.orphan_status),
      parental_death_covid: nullableBoolean(body.parental_death_covid),
      other_scholarship: nullableBoolean(body.other_scholarship),

      currently_studying: nullableBoolean(body.currently_studying),
      hosteller: nullableBoolean(body.hosteller),
      hostel_available: nullableBoolean(body.hostel_available),

      distance_km: nullableNumber(body.distance_km),
      beneficiary_siblings: nullableNumber(body.beneficiary_siblings),
    };

    const result = await withStudent(session.userId, (db) =>
      db.query(
      `
        INSERT INTO user_profiles (
          user_id,
          date_of_birth,
          gender,
          domicile_state,
          district,
          residence_type,
          social_category,

          minority_status,
          disability_status,
          disability_percentage,
          annual_family_income,

          current_course,
          degree_level,
          year_of_study,
          institution_name,
          institution_approval_body,

          marks_percentage,
          cgpa,
          class_12_percentage,
          class_12_percentile,

          admission_entry_type,
          aicte_approved_degree,

          employment_status,
          unemployment_days,

          self_employed,
          artisan_status,
          weaver_status,
          training_status,

          parent_occupation,
          parent_service_status,
          parent_martyred_status,

          orphan_status,
          parental_death_covid,
          other_scholarship,

          currently_studying,
          hosteller,
          hostel_available,

          distance_km,
          beneficiary_siblings,

          updated_at
        )
        VALUES (
          $1,  $2,  $3,  $4,  $5,
          $6,  $7,  $8,  $9,  $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35,
          $36, $37, $38, $39,
          CURRENT_TIMESTAMP
        )

        ON CONFLICT (user_id)
        DO UPDATE SET
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          domicile_state = EXCLUDED.domicile_state,
          district = EXCLUDED.district,
          residence_type = EXCLUDED.residence_type,
          social_category = EXCLUDED.social_category,

          minority_status = EXCLUDED.minority_status,
          disability_status = EXCLUDED.disability_status,
          disability_percentage = EXCLUDED.disability_percentage,
          annual_family_income = EXCLUDED.annual_family_income,

          current_course = EXCLUDED.current_course,
          degree_level = EXCLUDED.degree_level,
          year_of_study = EXCLUDED.year_of_study,
          institution_name = EXCLUDED.institution_name,
          institution_approval_body = EXCLUDED.institution_approval_body,

          marks_percentage = EXCLUDED.marks_percentage,
          cgpa = EXCLUDED.cgpa,
          class_12_percentage = EXCLUDED.class_12_percentage,
          class_12_percentile = EXCLUDED.class_12_percentile,

          admission_entry_type = EXCLUDED.admission_entry_type,
          aicte_approved_degree = EXCLUDED.aicte_approved_degree,

          employment_status = EXCLUDED.employment_status,
          unemployment_days = EXCLUDED.unemployment_days,

          self_employed = EXCLUDED.self_employed,
          artisan_status = EXCLUDED.artisan_status,
          weaver_status = EXCLUDED.weaver_status,
          training_status = EXCLUDED.training_status,

          parent_occupation = EXCLUDED.parent_occupation,
          parent_service_status = EXCLUDED.parent_service_status,
          parent_martyred_status = EXCLUDED.parent_martyred_status,

          orphan_status = EXCLUDED.orphan_status,
          parental_death_covid = EXCLUDED.parental_death_covid,
          other_scholarship = EXCLUDED.other_scholarship,

          currently_studying = EXCLUDED.currently_studying,
          hosteller = EXCLUDED.hosteller,
          hostel_available = EXCLUDED.hostel_available,

          distance_km = EXCLUDED.distance_km,
          beneficiary_siblings = EXCLUDED.beneficiary_siblings,

          updated_at = CURRENT_TIMESTAMP

        RETURNING *;
      `,
      [
        Number(session.userId),

        profile.date_of_birth,
        profile.gender,
        profile.domicile_state,
        profile.district,
        profile.residence_type,
        profile.social_category,

        profile.minority_status,
        profile.disability_status,
        profile.disability_percentage,
        profile.annual_family_income,

        profile.current_course,
        profile.degree_level,
        profile.year_of_study,
        profile.institution_name,
        profile.institution_approval_body,

        profile.marks_percentage,
        profile.cgpa,
        profile.class_12_percentage,
        profile.class_12_percentile,

        profile.admission_entry_type,
        profile.aicte_approved_degree,

        profile.employment_status,
        profile.unemployment_days,

        profile.self_employed,
        profile.artisan_status,
        profile.weaver_status,
        profile.training_status,

        profile.parent_occupation,
        profile.parent_service_status,
        profile.parent_martyred_status,

        profile.orphan_status,
        profile.parental_death_covid,
        profile.other_scholarship,

        profile.currently_studying,
        profile.hosteller,
        profile.hostel_available,

        profile.distance_km,
        profile.beneficiary_siblings,
      ]
    )
    );

    return Response.json({
      success: true,
      message: "Profile saved successfully.",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Student profile PUT error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to save profile.",
      },
      { status: 500 }
    );
  }
}