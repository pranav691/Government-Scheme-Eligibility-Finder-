// Attributes that evaluate_eligibility() can actually read, with their type.
// Sources: user_profiles columns, derived "age", and the application-level
// columns application_kind / previous_award_verified / attendance_percentage.
//
// Keep in sync with database/sql/18_rule_attribute_catalog.sql, which
// enforces the same list inside PostgreSQL with a composite foreign key.
export const RULE_ATTRIBUTES = {
  // numeric
  age: "numeric",
  annual_family_income: "numeric",
  attendance_percentage: "numeric",
  beneficiary_siblings: "numeric",
  cgpa: "numeric",
  class_12_percentage: "numeric",
  class_12_percentile: "numeric",
  disability_percentage: "numeric",
  distance_km: "numeric",
  marks_percentage: "numeric",
  unemployment_days: "numeric",
  year_of_study: "numeric",

  // text
  admission_entry_type: "text",
  application_kind: "text",
  current_course: "text",
  degree_level: "text",
  district: "text",
  domicile_state: "text",
  employment_status: "text",
  gender: "text",
  institution_approval_body: "text",
  institution_name: "text",
  parent_occupation: "text",
  parent_service_status: "text",
  residence_type: "text",
  social_category: "text",

  // boolean
  aicte_approved_degree: "boolean",
  artisan_status: "boolean",
  currently_studying: "boolean",
  disability_status: "boolean",
  hostel_available: "boolean",
  hosteller: "boolean",
  minority_status: "boolean",
  orphan_status: "boolean",
  other_scholarship: "boolean",
  parent_martyred_status: "boolean",
  parental_death_covid: "boolean",
  previous_award_verified: "boolean",
  self_employed: "boolean",
  training_status: "boolean",
  weaver_status: "boolean",
};

// Operators that evaluate_eligibility() supports for each value type.
export const OPERATORS_BY_TYPE = {
  numeric: ["=", "!=", ">", ">=", "<", "<="],
  text: ["=", "!=", "IN", "NOT IN"],
  boolean: ["=", "!="],
};

export const RULE_OPERATORS = ["=", "!=", ">", ">=", "<", "<=", "IN", "NOT IN"];
export const RULE_VALUE_TYPES = ["numeric", "text", "boolean"];

export function buildRuleValues(body) {
  const attribute_name =
    typeof body.attribute_name === "string" ? body.attribute_name.trim() : "";

  // The value type is decided by the attribute, never by the client.
  // A mismatch (e.g. gender as numeric) would make evaluate_eligibility()
  // fail with a cast error for every student checking this scheme.
  const value_type = RULE_ATTRIBUTES[attribute_name];

  if (!value_type) {
    return { error: "Choose a supported eligibility attribute." };
  }

  if (!OPERATORS_BY_TYPE[value_type].includes(body.operator)) {
    return {
      error: `Operator ${body.operator} cannot be used with ${value_type} attributes.`,
    };
  }

  let numeric_value = null;
  let text_value = null;
  let boolean_value = null;

  if (value_type === "numeric") {
    const raw = typeof body.value === "string" ? body.value.trim() : body.value;
    const n = Number(raw);
    if (raw === "" || raw === null || raw === undefined || !Number.isFinite(n)) {
      return { error: "A valid number is required." };
    }
    numeric_value = n;
  } else if (value_type === "text") {
    const t = typeof body.value === "string" ? body.value.trim() : "";
    if (!t) {
      return { error: "Text value is required." };
    }
    if (t.length > 500) {
      return { error: "Text value is too long." };
    }
    text_value = t;
  } else {
    boolean_value = body.value === true || body.value === "true";
  }

  const failure_message =
    typeof body.failure_message === "string"
      ? body.failure_message.trim().slice(0, 500) || null
      : null;

  return {
    attribute_name,
    operator: body.operator,
    value_type,
    numeric_value,
    text_value,
    boolean_value,
    failure_message,
  };
}
