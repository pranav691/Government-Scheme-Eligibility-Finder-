import bcrypt from "bcryptjs";

import authPool from "@/lib/auth-db";
import { createSession } from "@/lib/session";


export async function POST(request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    // Basic validation
    if (!email || !password) {
      return Response.json(
        {
          success: false,
          error: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    // Prevent unreasonable input sizes
    if (email.length > 254 || password.length > 128) {
      return Response.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const result = await authPool.query(
      `
        SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.password_hash,
          u.is_active,
          r.role_name
        FROM users AS u
        JOIN roles AS r
          ON r.role_id = u.role_id
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1
      `,
      [email]
    );

    if (result.rowCount !== 1) {
      return Response.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Disabled users cannot sign in
    if (!user.is_active) {
      return Response.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Compare entered password with bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return Response.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Store signed session cookie
    await createSession(user);

    return Response.json({
      success: true,
      user: {
        userId: Number(user.user_id),
        fullName: user.full_name,
        email: user.email,
        role: user.role_name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return Response.json(
      {
        success: false,
        error: "Unable to sign in.",
      },
      { status: 500 }
    );
  }
}