import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import authPool from "@/lib/auth-db";

const COOKIE_NAME = "scheme_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

// Create the signed JWT token
export async function createSessionToken(user) {
  return new SignJWT({
    userId: Number(user.user_id),
    email: user.email,
    role: user.role_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("scheme-finder")
    .setAudience("scheme-finder-web")
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

// Verify an existing JWT
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
      issuer: "scheme-finder",
      audience: "scheme-finder-web",
    });

    return payload;
  } catch {
    return null;
  }
}

// Create browser session after successful login
export async function createSession(user) {
  const token = await createSessionToken(user);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

// Read logged-in user's session
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  // The token is only a signed claim. Confirm against the database that the
  // account still exists, is still active, and still has the same role, so a
  // deactivated user or a changed role takes effect immediately.
  try {
    const result = await authPool.query(
      `
        SELECT u.is_active, r.role_name
        FROM users AS u
        JOIN roles AS r ON r.role_id = u.role_id
        WHERE u.user_id = $1
      `,
      [Number(payload.userId)]
    );

    const row = result.rows[0];

    if (!row || !row.is_active || row.role_name !== payload.role) {
      return null;
    }
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }

  return payload;
}

// Logout
export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}