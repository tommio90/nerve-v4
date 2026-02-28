"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { SidebarProvider, useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen w-full px-4 pb-10 pt-20 transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] md:px-8 md:pt-8",
          collapsed ? "md:ml-16" : "md:ml-56",
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}
