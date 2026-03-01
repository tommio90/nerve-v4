import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/invite") || request.nextUrl.pathname === "/login";

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // API key bypass for automated access (cron jobs, scripts)
  const apiKey = request.nextUrl.searchParams.get("api_key");
  const validApiKey = process.env.NERVE_API_KEY;
  
  if (apiKey && validApiKey && apiKey === validApiKey) {
    return NextResponse.next();
  }

  // If no valid API key, continue with normal auth flow
  // (NextAuth will handle the redirect if not authenticated)
  return;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.jpg|api/|.*\\..*).*)"],
};
