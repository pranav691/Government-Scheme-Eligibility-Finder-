import bcrypt from "bcryptjs";

import authPool from "@/lib/auth-db";
import { createSession } from "@/lib/session";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Valid bcrypt hash (cost 10) of a random string; used only to keep
// login timing uniform for unknown emails.
const DUMMY_HASH =
  "$2b$10$X1zQMZBR9Az5n6JOQ1jJyO6fhc/YBe5ddriYPlRqxfsAuSuugkQlS";


export async function POST(request) {
  // 10 sign-in attempts per minute per client.
  const limit = rateLimit(`login:${clientKey(request)}`, 10, 60_000);
  if (limit.limited) return tooManyRequests(limit.retryAfter);

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

    const user = result.rowCount === 1 ? result.rows[0] : null;

    // Always run one bcrypt comparison, even for unknown emails, so the
    // response time does not reveal whether an account exists.
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.password_hash : DUMMY_HASH
    );

    // Unknown user, wrong password and disabled account all look the same.
    if (!user || !passwordMatches || !user.is_active) {
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