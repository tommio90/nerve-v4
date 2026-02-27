import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const ADMIN_EMAIL = "gtomasello90@gmail.com";
const ADMIN_PASSWORD = "nerve2026";

function constantTimeEquals(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
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

      if (!constantTimeEquals(email, ADMIN_EMAIL) || !constantTimeEquals(password, ADMIN_PASSWORD)) {
        return null;
      }

      let admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });
      if (!admin) {
        admin = await db.user.create({
          data: {
            email: ADMIN_EMAIL,
            name: "Giuseppe Tomasello",
            passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
          },
        });
      } else if (!admin.passwordHash) {
        admin = await db.user.update({
          where: { id: admin.id },
          data: { passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) },
        });
      }

      if (!admin.passwordHash) {
        return null;
      }

      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!validPassword) {
        return null;
      }

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        image: admin.image,
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
      return email === ADMIN_EMAIL;
    },
    jwt: async ({ token, user }) => {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) session.user.id = token.sub;
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
