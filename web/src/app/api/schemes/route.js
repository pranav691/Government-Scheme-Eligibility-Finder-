import pool from "@/lib/db";
import { withApprovedSchemeLinks } from "@/lib/scheme-links";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        s.scheme_id,
        s.scheme_code,
        s.scheme_name,
        s.government_level,
        s.state_name,
        s.department,
        s.scheme_type,
        s.description,
        s.benefit_summary,
        s.application_mode,
        s.application_url,
        s.source_url,
        s.academic_year,
        s.scheme_status,
        s.verification_status,
        s.is_active,
        COALESCE(
          ARRAY_AGG(
            DISTINCT c.category_name
          ) FILTER (
            WHERE c.category_name IS NOT NULL
          ),
          ARRAY[]::VARCHAR[]
        ) AS categories
      FROM schemes s

      LEFT JOIN scheme_categories sc
        ON s.scheme_id = sc.scheme_id

      LEFT JOIN categories c
        ON sc.category_id = c.category_id

      WHERE s.is_active = TRUE

      GROUP BY s.scheme_id

      ORDER BY s.scheme_code;
    `);

    return Response.json({
      success: true,
      count: result.rows.length,
      schemes: result.rows.map(withApprovedSchemeLinks),
    });
  } catch (error) {
    console.error("Scheme API error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load schemes.",
      },
      { status: 500 }
    );
  }
}