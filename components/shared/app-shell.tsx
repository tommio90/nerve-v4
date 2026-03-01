"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CommandPalette } from "@/components/shared/command-palette";
import { Sidebar } from "@/components/shared/sidebar";
import { SidebarProvider, useSidebar } from "@/components/shared/sidebar-context";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed } = useSidebar();
  const isLogin = pathname === "/login";
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar onOpenSearch={() => setPaletteOpen(true)} />
      <main
        className={cn(
          "min-h-screen px-4 pb-10 pt-20 duration-300 [transition-property:margin-left] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] md:px-8 md:pt-8",
          collapsed ? "md:ml-16" : "md:ml-56",
        )}
      >
        {children}
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectDoc={(id) => {
          router.push(`/docs/${id}`);
          setPaletteOpen(false);
        }}
      />
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
