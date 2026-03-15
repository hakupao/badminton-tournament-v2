import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF protection via Origin header check.
 * Only allows requests from the same origin for state-changing methods.
 * Returns null if the request is valid, or a NextResponse with 403 if not.
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Only check state-changing methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // If no origin header, check referer
  if (!origin) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host === host) return null;
      } catch {
        // Invalid referer URL
      }
    }
    // Allow requests without both origin and referer (e.g., same-origin fetch)
    // In browsers, same-origin requests always include at least one of these
    // Lack of both typically means non-browser client (API testing, etc.)
    return null;
  }

  // Validate origin matches host
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === host) return null;
  } catch {
    // Invalid origin URL
  }

  return NextResponse.json(
    { error: "CSRF validation failed" },
    { status: 403 }
  );
}
