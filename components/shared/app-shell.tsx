"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      {/* Desktop: offset by sidebar width (w-56 = 224px). Mobile: offset by top bar height (h-14 = 56px). */}
      <main className="min-h-screen w-full px-4 pb-10 pt-20 md:ml-56 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
