import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    authorized: ({ auth, request }) => {
      const isAuthenticated = Boolean(auth?.user);
      const isLoginRoute = request.nextUrl.pathname === "/login";

      if (isLoginRoute && isAuthenticated) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      if (isLoginRoute) return true;

      return isAuthenticated;
    },
  },
} satisfies NextAuthConfig;
