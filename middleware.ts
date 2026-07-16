import { NextRequest, NextResponse } from "next/server";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

const limiter = new FixedWindowRateLimiter(120, 60_000);
const protectedPrefixes = ["/dashboard", "/admin", "/family", "/learn", "/tasks", "/plans", "/reports"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => name === "authjs.session-token" || name === "__Secure-authjs.session-token" || name.startsWith("authjs.session-token.") || name.startsWith("__Secure-authjs.session-token."));
  if (protectedPath && !hasSessionCookie) return NextResponse.redirect(new URL("/login", request.url));
  if (pathname.startsWith("/api/auth/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
    const result = limiter.check(`${ip}:${pathname}`);
    if (!result.allowed) return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))) } });
    const response = NextResponse.next(); response.headers.set("X-RateLimit-Remaining", String(result.remaining)); return response;
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/family/:path*", "/learn/:path*", "/tasks/:path*", "/plans/:path*", "/reports/:path*", "/api/auth/:path*"] };
