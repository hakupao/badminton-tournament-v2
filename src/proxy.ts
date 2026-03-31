import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const method = request.method.toUpperCase();

  if (
    !request.nextUrl.pathname.startsWith("/api/") ||
    method === "GET" || method === "HEAD" || method === "OPTIONS"
  ) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
