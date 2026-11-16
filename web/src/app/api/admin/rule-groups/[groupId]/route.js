import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

// Delete a rule group. Its rules are removed by ON DELETE CASCADE.
export async function DELETE(request, { params }) {
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

    const { groupId } = await params;
    const id = Number(groupId);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { success: false, error: "Invalid group id." },
        { status: 400 }
      );
    }

    const result = await adminPool.query(
      "DELETE FROM eligibility_rule_groups WHERE group_id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return Response.json(
        { success: false, error: "Group not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Rule group DELETE error:", error);

    return Response.json(
      { success: false, error: "Unable to delete rule group." },
      { status: 500 }
    );
  }
}
