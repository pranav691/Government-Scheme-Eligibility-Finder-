import officerPool from "@/lib/officer-db";
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

    if (session.role !== "officer") {
      return Response.json(
        {
          success: false,
          error: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const result = await officerPool.query(
      `
        SELECT
          a.application_id,
          a.application_kind,
          a.applied_at,
          a.current_status,
          a.eligibility_result,
          a.eligibility_reason,
          a.eligibility_checked_at,
          a.created_at,
          a.updated_at,

          u.user_id,
          u.full_name,
          u.email,

          s.scheme_id,
          s.scheme_code,
          s.scheme_name,
          s.department,
          s.scheme_type,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'log_id', l.log_id,
                  'old_status', l.old_status,
                  'new_status', l.new_status,
                  'changed_at', l.changed_at,
                  'changed_by', l.changed_by,
                  'remarks', l.remarks
                )
                ORDER BY l.changed_at ASC
              )
              FROM application_status_log l
              WHERE l.application_id = a.application_id
            ),
            '[]'::json
          ) AS status_history

        FROM applications a

        JOIN users u
          ON u.user_id = a.user_id

        JOIN schemes s
          ON s.scheme_id = a.scheme_id

        WHERE a.current_status IN (
          'submitted',
          'under_review'
        )

        ORDER BY
          a.applied_at ASC NULLS LAST,
          a.created_at ASC
      `
    );

    return Response.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.error("Officer applications GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load applications.",
      },
      { status: 500 }
    );
  }
}