"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

function sanitizeErrorPath(error: string) {
  return `/login?error=${encodeURIComponent(error)}`;
}

export async function loginWithCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(sanitizeErrorPath("missing_credentials"));
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        redirect(sanitizeErrorPath("invalid_credentials"));
      }
      redirect(sanitizeErrorPath("auth_failed"));
    }
    throw error;
  }
}

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}
