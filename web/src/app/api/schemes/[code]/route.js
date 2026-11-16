import pool from "@/lib/db";
import { withApprovedSchemeLinks } from "@/lib/scheme-links";

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    if (typeof code !== "string" || !/^[a-z0-9][a-z0-9_-]{0,49}$/i.test(code)) {
      return Response.json(
        { success: false, error: "Invalid scheme code" },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 1. MAIN SCHEME
    // --------------------------------------------------------

    const schemeResult = await pool.query(
      `
      SELECT
        scheme_id,
        scheme_code,
        scheme_name,
        government_level,
        state_name,
        department,
        scheme_type,
        description,
        benefit_summary,
        application_mode,
        application_url,
        source_url,
        academic_year,
        application_start_date,
        application_deadline,
        scheme_status,
        verification_status,
        eligibility_rules_complete,
        is_active
      FROM schemes
      WHERE UPPER(scheme_code) = UPPER($1)
        AND is_active = TRUE
      `,
      [code]
    );

    if (schemeResult.rows.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Scheme not found",
        },
        { status: 404 }
      );
    }

    const scheme = withApprovedSchemeLinks(schemeResult.rows[0]);
    const schemeId = scheme.scheme_id;

    // --------------------------------------------------------
    // 2. CATEGORIES
    // --------------------------------------------------------

    const categoriesResult = await pool.query(
      `
      SELECT
        c.category_id,
        c.category_name
      FROM scheme_categories sc
      JOIN categories c
        ON sc.category_id = c.category_id
      WHERE sc.scheme_id = $1
      ORDER BY c.category_name
      `,
      [schemeId]
    );

    // --------------------------------------------------------
    // 3. REQUIRED DOCUMENTS
    // --------------------------------------------------------

    const documentsResult = await pool.query(
      `
      SELECT
        document_id,
        document_name,
        is_mandatory,
        notes
      FROM scheme_documents
      WHERE scheme_id = $1
      ORDER BY is_mandatory DESC, document_name
      `,
      [schemeId]
    );

    // --------------------------------------------------------
    // 4. ELIGIBILITY RULE GROUPS AND THEIR RULES
    // --------------------------------------------------------

    const eligibilityResult = await pool.query(
      `
      SELECT
        g.group_id,
        g.group_name,
        g.group_order,
        r.rule_id,
        r.attribute_name,
        r.operator,
        r.value_type,
        r.numeric_value,
        r.text_value,
        r.boolean_value,
        r.failure_message
      FROM eligibility_rule_groups g
      LEFT JOIN eligibility_rules r ON r.group_id = g.group_id
      WHERE g.scheme_id = $1
        AND g.is_active = TRUE
      ORDER BY g.group_order, g.group_id, r.rule_id
      `,
      [schemeId]
    );

    const groups = new Map();

    for (const { group_id, group_name, group_order, ...rule } of eligibilityResult.rows) {
      if (!groups.has(group_id)) {
        groups.set(group_id, { group_id, group_name, group_order, rules: [] });
      }

      if (rule.rule_id !== null) {
        groups.get(group_id).rules.push(rule);
      }
    }

    return Response.json({
      success: true,
      scheme,
      categories: categoriesResult.rows,
      documents: documentsResult.rows,
      eligibility_groups: [...groups.values()],
    });
  } catch (error) {
    console.error("Scheme details API error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load scheme details.",
      },
      { status: 500 }
    );
  }
}