"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  CheckSquare,
  Cog,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Phone,
  Settings2,
  Users,
  Wand,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS = {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Package,
  FileText,
  BookOpen,
  Brain,
  Settings2,
  Phone,
  Cog,
  Users,
  Wand,
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed left-1/2 top-3 z-50 flex w-[90%] max-w-[672px] -translate-x-1/2 items-center justify-between gap-1 rounded-full border border-white/10 bg-[rgba(10,10,10,0.7)] px-2 py-1.5 backdrop-blur-glass shadow-[0_16px_35px_-24px_rgba(139,92,246,0.85)] sm:top-4 sm:w-[95%] sm:gap-2 sm:px-3 sm:py-2">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 py-1 sm:gap-2">
          <img src="/nerve-logo.jpg" alt="NERVE" className="h-6 w-6 rounded-full border border-white/20 sm:h-7 sm:w-7" />
          <span className="text-xs font-semibold tracking-[0.02em] sm:text-sm">NERVE</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                  active
                    ? "border-violet/40 bg-violet/20 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-cyan/30 hover:bg-white/8 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="hidden min-h-11 min-w-11 md:inline-flex" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="min-h-11 min-w-11 md:hidden" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
          <nav className="glass-panel absolute left-1/2 top-20 w-[90%] max-w-sm -translate-x-1/2 space-y-1 rounded-3xl p-3 sm:top-24 sm:w-[92%]" onClick={(e) => e.stopPropagation()}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = ICONS[item.icon as keyof typeof ICONS];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]",
                    active
                      ? "border-violet/40 bg-violet/20 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-cyan/30 hover:bg-white/8 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="outline" className="mt-2 min-h-11 w-full gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      ) : null}
    </>
  );
}
