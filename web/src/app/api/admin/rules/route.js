import { getSession } from "@/lib/session";
import adminPool from "@/lib/admin-db";
import { buildRuleValues } from "@/lib/ruleValidation";

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const groupId = Number(body.group_id);

    if (!Number.isInteger(groupId)) {
      return Response.json({ success: false, error: "Invalid group." }, { status: 400 });
    }

    const v = buildRuleValues(body);
    if (v.error) {
      return Response.json({ success: false, error: v.error }, { status: 400 });
    }

    const result = await adminPool.query(
      `
        INSERT INTO eligibility_rules
          (group_id, attribute_name, operator, value_type,
           numeric_value, text_value, boolean_value, failure_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        groupId,
        v.attribute_name,
        v.operator,
        v.value_type,
        v.numeric_value,
        v.text_value,
        v.boolean_value,
        v.failure_message,
      ]
    );

    return Response.json({ success: true, rule: result.rows[0] });
  } catch (error) {
    if (error.code === "23503" || error.code === "23514") {
      return Response.json(
        { success: false, error: "The database rejected this rule: the attribute, type or operator is not allowed." },
        { status: 400 }
      );
    }

    console.error("Rule POST error:", error);
    return Response.json({ success: false, error: "Unable to add rule." }, { status: 500 });
  }
}