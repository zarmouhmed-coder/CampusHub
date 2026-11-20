import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "campushub_session";
const PRIVATE_PREFIXES = ["/dashboard", "/subjects", "/assignments", "/exams", "/profile"];

/**
 * Optimistic redirects only, based on the presence of the session cookie.
 * The real check is done by the API on every request (an invalid or expired
 * cookie gets a 401, and the client then redirects to /login).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/dashboard" : "/login", request.url));
  }
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/subjects/:path*",
    "/assignments/:path*",
    "/exams/:path*",
    "/profile/:path*",
  ],
};
