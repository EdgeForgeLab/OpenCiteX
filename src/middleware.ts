import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

const AUTH_SECRET = process.env.AUTH_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  // Keep these references so Next inlines secrets into the Edge bundle.
  void AUTH_SECRET;
  void ENCRYPTION_KEY;

  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/brands/:path*", "/byok/:path*", "/jobs/:path*", "/scans/:path*", "/logs/:path*", "/results/:path*", "/prompts/:path*", "/settings/:path*", "/api/((?!auth).*)"],
};
