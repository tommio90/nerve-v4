import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const OWNER_EMAIL = "gtomasello90@gmail.com";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

const providers: Provider[] = [
  Credentials({
    name: "Email + Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) return null;

      let user = await db.user.findUnique({ where: { email } });

      if (!user && email === OWNER_EMAIL) {
        user = await db.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash(password, 12),
            role: "OWNER",
          },
        });
      }

      if (!user?.passwordHash) {
        return null;
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user }) => {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const existing = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          passwordHash: true,
          accounts: { select: { provider: true }, take: 1 },
        },
      });
      if (!existing) return false;
      return Boolean(existing.passwordHash || existing.accounts.length > 0);
    },
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role;
      } else if (token.sub && !token.role) {
        const existing = await db.user.findUnique({ where: { id: token.sub }, select: { role: true } });
        token.role = existing?.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
