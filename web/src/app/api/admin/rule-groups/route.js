import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

// Add a new (alternative / OR) eligibility rule group to a scheme.
export async function POST(request) {
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

    const body = await request.json();

    const schemeCode =
      typeof body.scheme_code === "string"
        ? body.scheme_code.trim().toUpperCase()
        : "";

    const groupName =
      typeof body.group_name === "string" ? body.group_name.trim() : "";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        { success: false, error: "Invalid scheme code." },
        { status: 400 }
      );
    }

    if (!groupName || groupName.length > 150) {
      return Response.json(
        {
          success: false,
          error: "Group name is required (maximum 150 characters).",
        },
        { status: 400 }
      );
    }

    const result = await adminPool.query(
      `
        INSERT INTO eligibility_rule_groups (scheme_id, group_name, group_order)
        SELECT
          s.scheme_id,
          $2,
          COALESCE(
            (
              SELECT MAX(g.group_order)
              FROM eligibility_rule_groups g
              WHERE g.scheme_id = s.scheme_id
            ),
            0
          ) + 1
        FROM schemes s
        WHERE UPPER(s.scheme_code) = $1
        RETURNING group_id, scheme_id, group_name, group_order
      `,
      [schemeCode, groupName]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, error: "Scheme not found." },
        { status: 404 }
      );
    }

    return Response.json(
      { success: true, group: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Rule group POST error:", error);

    return Response.json(
      { success: false, error: "Unable to add rule group." },
      { status: 500 }
    );
  }
}
