import bcrypt from "bcryptjs";

import authPool from "@/lib/auth-db";
import { createSession } from "@/lib/session";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Create a STUDENT account; the new user chooses their own password.
//
// Only the password HASH is stored (bcrypt, cost 12), never the password.
// The database role scheme_auth_reader may INSERT just four columns of
// users, and a Row-Level Security policy (users_auth_register_student in
// 19_row_level_security.sql) refuses any row whose role is not student,
// so this endpoint can never create an officer or admin.
export async function POST(request) {
  // 5 sign-ups per minute per client.
  const limit = rateLimit(`register:${clientKey(request)}`, 5, 60_000);
  if (limit.limited) return tooManyRequests(limit.retryAfter);

  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (fullName.length < 2 || fullName.length > 120) {
      return Response.json(
        { success: false, error: "Enter your full name (2-120 characters)." },
        { status: 400 }
      );
    }

    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return Response.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    // bcrypt only reads the first 72 bytes, so cap the length.
    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Password must be 8-72 characters and contain a letter and a number.",
        },
        { status: 400 }
      );
    }

    const existing = await authPool.query(
      `SELECT 1 FROM users WHERE LOWER(email) = $1`,
      [email]
    );

    if (existing.rowCount > 0) {
      return Response.json(
        {
          success: false,
          error: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const inserted = await authPool.query(
      `
        INSERT INTO users (role_id, full_name, email, password_hash)
        SELECT r.role_id, $1, $2, $3
        FROM roles r
        WHERE r.role_name = 'student'
        RETURNING user_id, full_name, email
      `,
      [fullName, email, passwordHash]
    );

    const user = inserted.rows[0];

    if (!user) {
      return Response.json(
        { success: false, error: "Unable to create account." },
        { status: 500 }
      );
    }

    // Sign the new student in straight away.
    await createSession({ ...user, role_name: "student" });

    return Response.json({
      success: true,
      user: {
        userId: Number(user.user_id),
        fullName: user.full_name,
        email: user.email,
        role: "student",
      },
    });
  } catch (error) {
    // 23505 = unique_violation (two sign-ups with the same email at once)
    if (error.code === "23505") {
      return Response.json(
        {
          success: false,
          error: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    console.error("Register error:", error);

    return Response.json(
      { success: false, error: "Unable to create account." },
      { status: 500 }
    );
  }
}
