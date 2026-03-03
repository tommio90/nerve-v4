import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/shared/app-shell";
import { ThemeProvider } from "@/components/shared/theme-provider";

export const metadata: Metadata = {
  title: "NERVE v4",
  description: "AI decision intelligence platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isPublicRoute = pathname.startsWith("/share/") || pathname === "/login";

  return (
    <html lang="en" className="overflow-x-hidden" suppressHydrationWarning>
      <body className="overflow-x-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ToastProvider>
            {isPublicRoute ? children : <AppShell>{children}</AppShell>}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
