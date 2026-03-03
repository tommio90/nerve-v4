"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CommandPalette } from "@/components/shared/command-palette";
import { AppSidebar } from "@/components/shared/sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <SidebarProvider>
      <AppSidebar onOpenSearch={() => setPaletteOpen(true)} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background px-4 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold tracking-wide">NERVE v4</span>
        </header>
        <main className="min-h-screen px-4 pb-10 pt-6 md:px-8">
          {children}
        </main>
      </SidebarInset>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectDoc={(id) => {
          router.push(`/docs/${id}`);
          setPaletteOpen(false);
        }}
      />
    </SidebarProvider>
  );
}
