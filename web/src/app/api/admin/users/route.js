import adminPool from "@/lib/admin-db";
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

    if (session.role !== "admin") {
      return Response.json(
        {
          success: false,
          error: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const result = await adminPool.query(
      `
        SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.is_active,
          u.created_at,
          r.role_name
        FROM users u
        JOIN roles r
          ON r.role_id = u.role_id
        ORDER BY
          r.role_name,
          u.full_name
      `
    );

    return Response.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to load users.",
      },
      { status: 500 }
    );
  }
}