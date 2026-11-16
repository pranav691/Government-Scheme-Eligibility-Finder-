import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

// Read-only overview of every application, with its status history.
export async function GET() {
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

    const result = await adminPool.query(
      `
        SELECT
          a.application_id,
          a.application_kind,
          a.current_status,
          a.eligibility_result,
          a.eligibility_reason,
          a.applied_at,
          a.updated_at,

          u.full_name,
          u.email,

          s.scheme_code,
          s.scheme_name,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'log_id', l.log_id,
                  'old_status', l.old_status,
                  'new_status', l.new_status,
                  'changed_at', l.changed_at,
                  'changed_by', l.changed_by,
                  'changed_by_name', cu.full_name
                )
                ORDER BY l.changed_at ASC, l.log_id ASC
              )
              FROM application_status_log l
              LEFT JOIN users cu
                ON cu.user_id = l.changed_by
              WHERE l.application_id = a.application_id
            ),
            '[]'::json
          ) AS status_history

        FROM applications a

        JOIN users u
          ON u.user_id = a.user_id

        JOIN schemes s
          ON s.scheme_id = a.scheme_id

        ORDER BY a.updated_at DESC
      `
    );

    return Response.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.error("Admin applications GET error:", error);

    return Response.json(
      { success: false, error: "Unable to load applications." },
      { status: 500 }
    );
  }
}
