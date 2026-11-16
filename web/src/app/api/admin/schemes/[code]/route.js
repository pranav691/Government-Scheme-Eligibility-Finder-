import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

export async function GET(request, { params }) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const { code } = await params;

    const schemeCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : "";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    const schemeResult = await adminPool.query(
      `
        SELECT *
        FROM schemes
        WHERE UPPER(scheme_code) = $1
        LIMIT 1
      `,
      [schemeCode]
    );

    if (schemeResult.rowCount === 0) {
      return Response.json(
        { success: false, error: "Scheme not found." },
        { status: 404 }
      );
    }

    const scheme = schemeResult.rows[0];

    const groupsResult = await adminPool.query(
      `
        SELECT
          g.group_id,
          g.scheme_id,
          g.group_name,
          g.group_order,

          COALESCE(
            json_agg(
              json_build_object(
                'rule_id', r.rule_id,
                'attribute_name', r.attribute_name,
                'operator', r.operator,
                'value_type', r.value_type,
                'numeric_value', r.numeric_value,
                'text_value', r.text_value,
                'boolean_value', r.boolean_value,
                'failure_message', r.failure_message
              )
              ORDER BY r.rule_id
            ) FILTER (WHERE r.rule_id IS NOT NULL),
            '[]'::json
          ) AS rules

        FROM eligibility_rule_groups g

        LEFT JOIN eligibility_rules r
          ON r.group_id = g.group_id

        WHERE g.scheme_id = $1

        GROUP BY
          g.group_id,
          g.scheme_id,
          g.group_name,
          g.group_order

        ORDER BY g.group_order, g.group_id
      `,
      [scheme.scheme_id]
    );

    return Response.json({
      success: true,
      scheme,
      eligibility_groups: groupsResult.rows,
    });
  } catch (error) {
    console.error("Admin scheme GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load scheme.",
      },
      { status: 500 }
    );
  }
}

async function adminSchemeCode(params) {
  const session = await getSession();

  if (!session) {
    return {
      error: Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "admin") {
    return {
      error: Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      ),
    };
  }

  const { code } = await params;

  const schemeCode =
    typeof code === "string" ? code.trim().toUpperCase() : "";

  if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
    return {
      error: Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      ),
    };
  }

  return { schemeCode };
}

// Activate / deactivate a scheme without deleting it.
export async function PATCH(request, { params }) {
  try {
    const { schemeCode, error } = await adminSchemeCode(params);
    if (error) return error;

    const body = await request.json();

    if (typeof body.is_active !== "boolean") {
      return Response.json(
        { success: false, error: "is_active must be true or false." },
        { status: 400 }
      );
    }

    const result = await adminPool.query(
      `
        UPDATE schemes
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE UPPER(scheme_code) = $2
        RETURNING scheme_code, is_active
      `,
      [body.is_active, schemeCode]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, error: "Scheme not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, scheme: result.rows[0] });
  } catch (error) {
    console.error("Admin scheme PATCH error:", error);

    return Response.json(
      { success: false, error: "Unable to update scheme." },
      { status: 500 }
    );
  }
}

// Delete a scheme. Rule groups, rules, documents and category links are
// removed by ON DELETE CASCADE. Applications use ON DELETE RESTRICT, so a
// scheme that already has applications cannot be deleted.
export async function DELETE(request, { params }) {
  try {
    const { schemeCode, error } = await adminSchemeCode(params);
    if (error) return error;

    const result = await adminPool.query(
      `
        DELETE FROM schemes
        WHERE UPPER(scheme_code) = $1
        RETURNING scheme_code
      `,
      [schemeCode]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, error: "Scheme not found." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Scheme deleted successfully.",
    });
  } catch (error) {
    if (error.code === "23503") {
      return Response.json(
        {
          success: false,
          error:
            "This scheme has applications and cannot be deleted. Deactivate it instead.",
        },
        { status: 409 }
      );
    }

    console.error("Admin scheme DELETE error:", error);

    return Response.json(
      { success: false, error: "Unable to delete scheme." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const { code } = await params;

    const schemeCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : "";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const governmentLevel = body.government_level;
    const schemeStatus = body.scheme_status;
    const verificationStatus = body.verification_status;
    const applicationMode = body.application_mode || null;

    if (!["national", "state"].includes(governmentLevel)) {
      return Response.json(
        { success: false, error: "Invalid government level." },
        { status: 400 }
      );
    }

    if (
      !["upcoming", "open", "closed", "expired"].includes(
        schemeStatus
      )
    ) {
      return Response.json(
        { success: false, error: "Invalid scheme status." },
        { status: 400 }
      );
    }

    if (
      !["unverified", "verified", "needs_review"].includes(
        verificationStatus
      )
    ) {
      return Response.json(
        { success: false, error: "Invalid verification status." },
        { status: 400 }
      );
    }

    if (
      applicationMode &&
      !["online", "offline", "both", "unknown"].includes(
        applicationMode
      )
    ) {
      return Response.json(
        { success: false, error: "Invalid application mode." },
        { status: 400 }
      );
    }

    let stateName =
      typeof body.state_name === "string"
        ? body.state_name.trim()
        : null;

    if (governmentLevel === "national") {
      stateName = null;
    }

    if (governmentLevel === "state" && !stateName) {
      return Response.json(
        {
          success: false,
          error: "State name is required for state schemes.",
        },
        { status: 400 }
      );
    }

    const result = await adminPool.query(
      `
        UPDATE schemes
        SET
          scheme_name = $1,
          government_level = $2,
          state_name = $3,
          department = $4,
          scheme_type = $5,
          description = $6,
          benefit_summary = $7,
          application_mode = $8,
          application_url = $9,
          source_url = $10,
          academic_year = $11,
          application_start_date = $12,
          application_deadline = $13,
          scheme_status = $14,
          verification_status = $15,
          last_verified_date = $16,
          is_active = $17,
          eligibility_rules_complete = $18,
          updated_at = CURRENT_TIMESTAMP
        WHERE UPPER(scheme_code) = $19
        RETURNING *
      `,
      [
        body.scheme_name?.trim(),
        governmentLevel,
        stateName,
        body.department?.trim() || null,
        body.scheme_type?.trim() || null,
        body.description?.trim() || null,
        body.benefit_summary?.trim() || null,
        applicationMode,
        body.application_url?.trim() || null,
        body.source_url?.trim() || null,
        body.academic_year?.trim() || null,
        body.application_start_date || null,
        body.application_deadline || null,
        schemeStatus,
        verificationStatus,
        body.last_verified_date || null,
        Boolean(body.is_active),
        Boolean(body.eligibility_rules_complete),
        schemeCode,
      ]
    );

    if (result.rowCount === 0) {
      return Response.json(
        {
          success: false,
          error: "Scheme not found.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Scheme updated successfully.",
      scheme: result.rows[0],
    });
  } catch (error) {
    console.error("Admin scheme PUT error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to update scheme.",
      },
      { status: 500 }
    );
  }
}