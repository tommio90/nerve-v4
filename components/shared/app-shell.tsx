"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isInvite = pathname.startsWith("/invite");

  if (isLogin || isInvite) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen w-full px-3 pb-8 pt-28 sm:px-4 sm:pt-32 md:px-6">{children}</main>
    </div>
  );
}
