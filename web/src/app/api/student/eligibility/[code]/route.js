import { withStudent } from "@/lib/student-db";
import { getSession } from "@/lib/session";

export async function GET(request, { params }) {
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

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          error: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const { code } = await params;

    const schemeCode =
      typeof code === "string"
        ? code.trim().toUpperCase()
        : "";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        {
          success: false,
          error: "Invalid scheme code.",
        },
        { status: 400 }
      );
    }

    // First resolve scheme code -> scheme_id
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
          error: "Scheme is not currently active.",
        },
        { status: 404 }
      );
    }

    // IMPORTANT:
    // user ID comes from the authenticated session,
    // never from the browser request.
    const eligibilityResult = await withStudent(session.userId, (db) =>
      db.query(
      `
        SELECT
          eligibility_status,
          explanation
        FROM evaluate_eligibility($1, $2)
      `,
      [
        Number(session.userId),
        Number(scheme.scheme_id),
      ]
    )
    );

    if (eligibilityResult.rowCount === 0) {
      return Response.json(
        {
          success: false,
          error: "Eligibility could not be evaluated.",
        },
        { status: 500 }
      );
    }

    const result = eligibilityResult.rows[0];

    return Response.json({
      success: true,
      scheme: {
        schemeId: Number(scheme.scheme_id),
        schemeCode: scheme.scheme_code,
        schemeName: scheme.scheme_name,
      },
      eligibility: {
        status: result.eligibility_status,
        reason: result.explanation,
      },
    });
  } catch (error) {
    console.error("Eligibility API error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to check eligibility.",
      },
      { status: 500 }
    );
  }
}