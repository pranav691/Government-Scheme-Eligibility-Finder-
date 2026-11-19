import { NextResponse } from "next/server";

// CSRF defence for every state-changing API call.
//
// The session cookie is SameSite=Lax, and browsers always send an Origin
// header on cross-site POST/PUT/PATCH/DELETE requests. If that header is
// present and does not match this site's host, the request is rejected
// before any route code runs.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request) {
  if (SAFE_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");

  if (origin) {
    let originHost = null;

    try {
      originHost = new URL(origin).host;
    } catch {
      // Malformed Origin header: treated as a mismatch below.
    }

    const host = request.headers.get("host");

    if (!originHost || originHost !== host) {
      return NextResponse.json(
        { success: false, error: "Cross-site request blocked." },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
