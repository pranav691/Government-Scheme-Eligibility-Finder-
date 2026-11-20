import adminPool from "@/lib/admin-db";
import { getSession } from "@/lib/session";

// Delete a student or officer account (admin only).
//
// Layers: this route checks the session is an admin; the database role
// scheme_admin_app has DELETE on users only through the RLS policy
// users_admin_delete (never admin accounts); and foreign keys refuse users
// who still own applications (ON DELETE RESTRICT). Deleting a user also
// removes their profile (CASCADE) and keeps their history rows with
// changed_by set to NULL (SET NULL).
export async function DELETE(request, { params }) {
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

    const { userId } = await params;
    const targetId = Number(userId);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return Response.json(
        { success: false, error: "Invalid user ID." },
        { status: 400 }
      );
    }

    if (targetId === Number(session.userId)) {
      return Response.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const deleted = await adminPool.query(
      `
        DELETE FROM users
        WHERE user_id = $1
        RETURNING user_id
      `,
      [targetId]
    );

    if (deleted.rowCount === 1) {
      return Response.json({ success: true, message: "User deleted." });
    }

    // Nothing deleted: either no such user, or an admin account (RLS).
    const existing = await adminPool.query(
      `SELECT 1 FROM users WHERE user_id = $1`,
      [targetId]
    );

    if (existing.rowCount === 0) {
      return Response.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    return Response.json(
      { success: false, error: "Admin accounts cannot be deleted." },
      { status: 400 }
    );
  } catch (error) {
    // 23001 = restrict_violation, 23503 = foreign_key_violation
    // (the user still has applications)
    if (error.code === "23001" || error.code === "23503") {
      return Response.json(
        {
          success: false,
          error:
            "This user has applications and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    console.error("Admin user delete error:", error);

    return Response.json(
      { success: false, error: "Unable to delete user." },
      { status: 500 }
    );
  }
}
