import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

// Delete one of the signed-in student's own DRAFT applications.
//
// Three layers keep this safe:
//   1. this route only runs for a signed-in student and only targets the
//      session's own user id,
//   2. the SQL below also requires current_status = 'draft',
//   3. PostgreSQL Row-Level Security (19_row_level_security.sql) refuses to
//      delete another student's row or any non-draft application, even if
//      this route had a bug.
export async function DELETE(request, { params }) {
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

    const { id } = await params;
    const applicationId = Number(id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return Response.json(
        { success: false, error: "Invalid application ID." },
        { status: 400 }
      );
    }

    const userId = Number(session.userId);

    const outcome = await withStudent(userId, async (db) => {
      const deleted = await db.query(
        `
          DELETE FROM applications
          WHERE application_id = $1
            AND user_id = $2
            AND current_status = 'draft'
          RETURNING application_id
        `,
        [applicationId, userId]
      );

      if (deleted.rowCount === 1) {
        return { deleted: true };
      }

      // Nothing deleted: say why (RLS lets the student see only own rows).
      const existing = await db.query(
        `
          SELECT current_status
          FROM applications
          WHERE application_id = $1
            AND user_id = $2
        `,
        [applicationId, userId]
      );

      return { deleted: false, found: existing.rowCount === 1 };
    });

    if (outcome.deleted) {
      return Response.json({
        success: true,
        message: "Draft deleted.",
      });
    }

    if (!outcome.found) {
      return Response.json(
        { success: false, error: "Application not found." },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: false,
        error: "Only draft applications can be deleted.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Application delete error:", error);

    return Response.json(
      { success: false, error: "Unable to delete draft." },
      { status: 500 }
    );
  }
}
