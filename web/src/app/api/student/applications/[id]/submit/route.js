import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

// Thrown inside the transaction to stop (and roll back) with a
// user-facing message.
class SubmitError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateIso(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export async function POST(request, { params }) {
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

  try {
    const outcome = await withStudent(userId, async (db) => {
      // Lock the application row for the rest of the transaction.
      const result = await db.query(
        `
          SELECT
            a.application_id,
            a.scheme_id,
            a.application_kind,
            a.current_status,

            s.scheme_code,
            s.scheme_name,
            s.scheme_status,
            s.application_start_date,
            s.application_deadline,
            s.is_active
          FROM applications a
          JOIN schemes s
            ON s.scheme_id = a.scheme_id
          WHERE a.application_id = $1
            AND a.user_id = $2
          FOR UPDATE OF a
        `,
        [applicationId, userId]
      );

      if (result.rowCount === 0) {
        throw new SubmitError("Application not found.", 404);
      }

      const application = result.rows[0];

      if (application.current_status !== "draft") {
        throw new SubmitError("Only draft applications can be submitted.");
      }

      if (!application.application_kind) {
        throw new SubmitError("Application type is missing.");
      }

      if (!application.is_active) {
        throw new SubmitError("This scheme is not active.");
      }

      if (application.scheme_status !== "open") {
        throw new SubmitError(
          `This scheme is ${application.scheme_status}; applications are not being accepted.`
        );
      }

      const today = todayIso();
      const startDate = dateIso(application.application_start_date);
      const deadline = dateIso(application.application_deadline);

      if (startDate && today < startDate) {
        throw new SubmitError(
          `Applications for this scheme open on ${startDate}.`
        );
      }

      if (deadline && today > deadline) {
        throw new SubmitError("The application deadline has passed.");
      }

      // Re-evaluate NOW, against the student's current profile.
      // The result stored when the draft was created may be stale.
      const evaluation = await db.query(
        `
          SELECT eligibility_status, explanation
          FROM evaluate_eligibility($1, $2)
        `,
        [userId, Number(application.scheme_id)]
      );

      const fresh = evaluation.rows[0];

      if (!fresh) {
        throw new SubmitError("Eligibility could not be evaluated.", 500);
      }

      await db.query(
        `
          UPDATE applications
          SET
            eligibility_result = $1,
            eligibility_reason = $2,
            eligibility_checked_at = CURRENT_TIMESTAMP
          WHERE application_id = $3
            AND user_id = $4
        `,
        [fresh.eligibility_status, fresh.explanation, applicationId, userId]
      );

      if (fresh.eligibility_status === "ineligible") {
        // RETURN (not throw) so the transaction COMMITS and the refreshed
        // result is saved; the student then sees the current reason.
        return { ineligibleReason: fresh.explanation };
      }

      // withStudent() already set app.current_user_id for this
      // transaction, so the status-log trigger records the student.
      const updated = await db.query(
        `
          UPDATE applications
          SET
            current_status = 'submitted',
            applied_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE application_id = $1
            AND user_id = $2
          RETURNING
            application_id,
            application_kind,
            applied_at,
            current_status,
            eligibility_result,
            eligibility_reason,
            updated_at
        `,
        [applicationId, userId]
      );

      return { application: updated.rows[0] };
    });

    if (outcome.ineligibleReason) {
      return Response.json(
        {
          success: false,
          error: `Not eligible: ${outcome.ineligibleReason}`,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Application submitted successfully.",
      application: outcome.application,
    });
  } catch (error) {
    if (error instanceof SubmitError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Application submit error:", error);

    return Response.json(
      { success: false, error: "Unable to submit application." },
      { status: 500 }
    );
  }
}
