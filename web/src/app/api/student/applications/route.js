import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const result = await withStudent(session.userId, (db) =>
      db.query(
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

        JOIN schemes s
          ON s.scheme_id = a.scheme_id

        WHERE a.user_id = $1

        ORDER BY a.created_at DESC
      `,
      [Number(session.userId)]
    )
    );

    return Response.json({
      success: true,
      applications: result.rows,
    });
  } catch (error) {
    console.error("Applications GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load applications.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        { success: false, error: "Forbidden." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const schemeCode =
      typeof body.schemeCode === "string"
        ? body.schemeCode.trim().toUpperCase()
        : "";

    const applicationKind =
      typeof body.applicationKind === "string"
        ? body.applicationKind.trim().toLowerCase()
        : "fresh";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        {
          success: false,
          error: "Invalid scheme code.",
        },
        { status: 400 }
      );
    }

    if (!["fresh", "renewal"].includes(applicationKind)) {
      return Response.json(
        {
          success: false,
          error: "Invalid application type.",
        },
        { status: 400 }
      );
    }

    // Resolve scheme first.
    const schemeResult = await withStudent(session.userId, (db) =>
      db.query(
      `
        SELECT
          scheme_id,
          scheme_code,
          scheme_name,
          is_active
        FROM schemes
        WHERE UPPER(scheme_code) = $1
        LIMIT 1
      `,
      [schemeCode]
    )
    );

    if (schemeResult.rowCount === 0) {
      return Response.json(
        {
          success: false,
          error: "Scheme not found.",
        },
        { status: 404 }
      );
    }

    const scheme = schemeResult.rows[0];

    if (!scheme.is_active) {
      return Response.json(
        {
          success: false,
          error: "Scheme is not active.",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate application.
    const existing = await withStudent(session.userId, (db) =>
      db.query(
      `
        SELECT application_id
        FROM applications
        WHERE user_id = $1
          AND scheme_id = $2
        LIMIT 1
      `,
      [
        Number(session.userId),
        Number(scheme.scheme_id),
      ]
    )
    );

    if (existing.rowCount > 0) {
      return Response.json(
        {
          success: false,
          error: "You already have an application for this scheme.",
        },
        { status: 409 }
      );
    }

    // Use the PostgreSQL procedure we already created.
    await withStudent(session.userId, (db) =>
      db.query(
      `
        CALL submit_scheme_application($1, $2, $3)
      `,
      [
        session.email,
        schemeCode,
        applicationKind,
      ]
    )
    );

    // Load the newly-created draft.
    const result = await withStudent(session.userId, (db) =>
      db.query(
      `
        SELECT
          a.application_id,
          a.application_kind,
          a.current_status,
          a.eligibility_result,
          a.eligibility_reason,
          a.eligibility_checked_at,
          a.created_at,

          s.scheme_code,
          s.scheme_name

        FROM applications a

        JOIN schemes s
          ON s.scheme_id = a.scheme_id

        WHERE a.user_id = $1
          AND a.scheme_id = $2

        LIMIT 1
      `,
      [
        Number(session.userId),
        Number(scheme.scheme_id),
      ]
    )
    );

    return Response.json(
      {
        success: true,
        message: "Application draft created successfully.",
        application: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Applications POST error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to create application.",
      },
      { status: 500 }
    );
  }
}