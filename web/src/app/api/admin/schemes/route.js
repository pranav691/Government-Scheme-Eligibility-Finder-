import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

export async function POST(request) {
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

    const body = await request.json();

    const schemeCode =
      typeof body.scheme_code === "string"
        ? body.scheme_code.trim().toUpperCase()
        : "";

    if (!/^[A-Z0-9_-]{1,50}$/.test(schemeCode)) {
      return Response.json(
        {
          success: false,
          error:
            "Scheme code must be 1-50 characters: letters, digits, _ or -.",
        },
        { status: 400 }
      );
    }

    const schemeName =
      typeof body.scheme_name === "string" ? body.scheme_name.trim() : "";

    if (!schemeName) {
      return Response.json(
        { success: false, error: "Scheme name is required." },
        { status: 400 }
      );
    }

    const governmentLevel = body.government_level;
    const schemeStatus = body.scheme_status || "upcoming";
    const verificationStatus = body.verification_status || "unverified";
    const applicationMode = body.application_mode || null;

    if (!["national", "state"].includes(governmentLevel)) {
      return Response.json(
        { success: false, error: "Invalid government level." },
        { status: 400 }
      );
    }

    if (!["upcoming", "open", "closed", "expired"].includes(schemeStatus)) {
      return Response.json(
        { success: false, error: "Invalid scheme status." },
        { status: 400 }
      );
    }

    if (
      !["unverified", "verified", "needs_review"].includes(
        verificationStatus
      )
    ) {
      return Response.json(
        { success: false, error: "Invalid verification status." },
        { status: 400 }
      );
    }

    if (
      applicationMode &&
      !["online", "offline", "both", "unknown"].includes(applicationMode)
    ) {
      return Response.json(
        { success: false, error: "Invalid application mode." },
        { status: 400 }
      );
    }

    let stateName =
      typeof body.state_name === "string" ? body.state_name.trim() : null;

    if (governmentLevel === "national") {
      stateName = null;
    }

    if (governmentLevel === "state" && !stateName) {
      return Response.json(
        {
          success: false,
          error: "State name is required for state schemes.",
        },
        { status: 400 }
      );
    }

    const result = await adminPool.query(
      `
        INSERT INTO schemes (
          scheme_code, scheme_name, government_level, state_name,
          department, scheme_type, description, benefit_summary,
          application_mode, application_url, source_url, academic_year,
          application_start_date, application_deadline,
          scheme_status, verification_status, is_active,
          eligibility_rules_complete
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, TRUE, FALSE
        )
        RETURNING scheme_id, scheme_code, scheme_name
      `,
      [
        schemeCode,
        schemeName,
        governmentLevel,
        stateName,
        body.department?.trim() || null,
        body.scheme_type?.trim() || null,
        body.description?.trim() || null,
        body.benefit_summary?.trim() || null,
        applicationMode,
        body.application_url?.trim() || null,
        body.source_url?.trim() || null,
        body.academic_year?.trim() || null,
        body.application_start_date || null,
        body.application_deadline || null,
        schemeStatus,
        verificationStatus,
      ]
    );

    return Response.json(
      {
        success: true,
        message: "Scheme created successfully.",
        scheme: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return Response.json(
        { success: false, error: "A scheme with this code already exists." },
        { status: 409 }
      );
    }

    if (error.code === "23514") {
      return Response.json(
        {
          success: false,
          error:
            "A database rule rejected these values (for example, the deadline is before the start date).",
        },
        { status: 400 }
      );
    }

    console.error("Admin scheme POST error:", error);

    return Response.json(
      { success: false, error: "Unable to create scheme." },
      { status: 500 }
    );
  }
}

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
          scheme_id,
          scheme_code,
          scheme_name,
          government_level,
          state_name,
          department,
          scheme_type,
          scheme_status,
          verification_status,
          eligibility_rules_complete,
          is_active,
          application_deadline,
          last_verified_date
        FROM schemes
        ORDER BY scheme_code
      `
    );

    return Response.json({
      success: true,
      schemes: result.rows,
    });
  } catch (error) {
    console.error("Admin schemes GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load schemes.",
      },
      { status: 500 }
    );
  }
}