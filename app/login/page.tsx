import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginWithCredentials, loginWithGoogle } from "@/app/login/actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_credentials: "Enter both email and password.",
  invalid_credentials: "Invalid email or password.",
  auth_failed: "Authentication failed. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] ?? "Sign in failed." : null;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(139,92,246,0.26),transparent_40%),radial-gradient(circle_at_90%_100%,rgba(6,182,212,0.2),transparent_42%)]" />
      <Card className="relative z-10 w-full max-w-md border-white/10 bg-[rgba(10,10,10,0.72)] p-7 backdrop-blur-glass">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-violet/35 bg-violet/15 p-2">
            <ShieldCheck className="h-5 w-5 text-violet" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">NERVE v4</h1>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        <form action={loginWithCredentials} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="gtomasello90@gmail.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>

          {errorMessage ? <p className="text-xs text-red-300">{errorMessage}</p> : null}

          <Button type="submit" className="h-10 w-full">
            Sign In
          </Button>
        </form>

        {googleEnabled ? (
          <form action={loginWithGoogle} className="mt-3">
            <Button type="submit" variant="outline" className="h-10 w-full">
              Continue with Google
            </Button>
          </form>
        ) : null}
      </Card>
    </main>
  );
}
