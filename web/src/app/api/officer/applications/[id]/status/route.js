import officerPool from "@/lib/officer-db";
import { getSession } from "@/lib/session";

export async function POST(request, { params }) {
  const client = await officerPool.connect();

  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, error: "Not authenticated." },
        { status: 401 }
      );
    }

    if (session.role !== "officer") {
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

    const body = await request.json();

    const newStatus =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : "";

    const allowedStatuses = [
      "under_review",
      "approved",
      "rejected",
    ];

    if (!allowedStatuses.includes(newStatus)) {
      return Response.json(
        { success: false, error: "Invalid status." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT
          a.application_id,
          a.current_status,
          a.user_id,
          s.scheme_code,
          s.scheme_name
        FROM applications a
        JOIN schemes s
          ON s.scheme_id = a.scheme_id
        WHERE a.application_id = $1
        FOR UPDATE OF a
      `,
      [applicationId]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return Response.json(
        { success: false, error: "Application not found." },
        { status: 404 }
      );
    }

    const application = currentResult.rows[0];

    const validTransition =
      (application.current_status === "submitted" &&
        newStatus === "under_review") ||
      (application.current_status === "under_review" &&
        ["approved", "rejected"].includes(newStatus));

    if (!validTransition) {
      await client.query("ROLLBACK");

      return Response.json(
        {
          success: false,
          error: `Invalid status transition from ${application.current_status} to ${newStatus}.`,
        },
        { status: 400 }
      );
    }

    // Make authenticated officer visible to the trigger.
    await client.query(
      `
        SELECT set_config(
          'app.current_user_id',
          $1,
          true
        )
      `,
      [String(session.userId)]
    );

    const updated = await client.query(
      `
        UPDATE applications
        SET
          current_status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE application_id = $2
        RETURNING
          application_id,
          current_status,
          updated_at
      `,
      [newStatus, applicationId]
    );

    await client.query("COMMIT");

    return Response.json({
      success: true,
      message: "Application status updated successfully.",
      application: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Officer status update error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to update application status.",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}