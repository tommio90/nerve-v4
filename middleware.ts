import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((request: NextRequest) => {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Propagate pathname so layouts can detect route without hooks
  response.headers.set("x-pathname", pathname);

  // Public routes — skip auth entirely
  if (pathname.startsWith("/share/") || pathname === "/login") {
    return response;
  }

  // API key bypass for automated access (cron jobs, scripts)
  const apiKey = request.nextUrl.searchParams.get("api_key");
  const validApiKey = process.env.NERVE_API_KEY;

  if (apiKey && validApiKey && apiKey === validApiKey) {
    return response;
  }

  return response;
});

export const config = {
  // Run on all routes except static assets and API routes
  // share/ is included so we can set x-pathname header (auth skipped below)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.jpg|api/|.*\\..*).*)"],
};
