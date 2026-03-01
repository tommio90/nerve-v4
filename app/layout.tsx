import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shared/app-shell";

export const metadata: Metadata = {
  title: "NERVE v4",
  description: "AI decision intelligence platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isPublicRoute = pathname.startsWith("/share/") || pathname === "/login";

  return (
    <html lang="en" className="dark overflow-x-hidden">
      <body className="relative overflow-x-hidden antialiased">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="orb orb-violet left-[-6rem] top-[8rem] h-64 w-64 animate-[orb-float_15s_cubic-bezier(0.23,1,0.32,1)_infinite_alternate]" />
          <div className="orb orb-cyan right-[-5rem] top-[20rem] h-72 w-72 animate-[orb-float_9s_cubic-bezier(0.23,1,0.32,1)_infinite_alternate-reverse]" />
          <div className="orb orb-emerald bottom-[-5rem] left-[20%] h-60 w-60 animate-[orb-float_6s_cubic-bezier(0.23,1,0.32,1)_infinite_alternate]" />
        </div>
        <ToastProvider>
          {isPublicRoute ? children : <AppShell>{children}</AppShell>}
        </ToastProvider>
      </body>
    </html>
  );
}
