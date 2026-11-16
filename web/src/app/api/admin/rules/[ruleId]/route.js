import { getSession } from "@/lib/session";
import adminPool from "@/lib/admin-db";
import { buildRuleValues } from "@/lib/ruleValidation";

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return Response.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
  if (session.role !== "admin") {
    return Response.json({ success: false, error: "Forbidden." }, { status: 403 });
  }
  return null;
}

export async function PUT(request, { params }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { ruleId } = await params;
    const id = Number(ruleId);

    if (!Number.isInteger(id)) {
      return Response.json({ success: false, error: "Invalid rule id." }, { status: 400 });
    }

    const body = await request.json();
    const v = buildRuleValues(body);

    if (v.error) {
      return Response.json({ success: false, error: v.error }, { status: 400 });
    }

    const result = await adminPool.query(
      `
        UPDATE eligibility_rules
        SET attribute_name = $1,
            operator = $2,
            value_type = $3,
            numeric_value = $4,
            text_value = $5,
            boolean_value = $6,
            failure_message = $7
        WHERE rule_id = $8
        RETURNING *
      `,
      [
        v.attribute_name,
        v.operator,
        v.value_type,
        v.numeric_value,
        v.text_value,
        v.boolean_value,
        v.failure_message,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return Response.json({ success: false, error: "Rule not found." }, { status: 404 });
    }

    return Response.json({ success: true, rule: result.rows[0] });
  } catch (error) {
    if (error.code === "23503" || error.code === "23514") {
      return Response.json(
        { success: false, error: "The database rejected this rule: the attribute, type or operator is not allowed." },
        { status: 400 }
      );
    }

    console.error("Rule PUT error:", error);
    return Response.json({ success: false, error: "Unable to update rule." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { ruleId } = await params;
    const id = Number(ruleId);

    if (!Number.isInteger(id)) {
      return Response.json({ success: false, error: "Invalid rule id." }, { status: 400 });
    }

    const result = await adminPool.query(
      "DELETE FROM eligibility_rules WHERE rule_id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return Response.json({ success: false, error: "Rule not found." }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Rule DELETE error:", error);
    return Response.json({ success: false, error: "Unable to delete rule." }, { status: 500 });
  }
}