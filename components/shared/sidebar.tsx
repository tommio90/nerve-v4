"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Contact,
  FileText,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS, STARTUP_OS_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS = {
  Bot,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Users,
  Target,
  FlaskConical,
  Contact,
  MessageSquare,
} as const;

function NavLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  const Icon = ICONS[icon as keyof typeof ICONS];

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
        active
          ? "border-violet/40 bg-violet/15 text-foreground"
          : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (onClose?: () => void) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img
          src="/nerve-logo.jpg"
          alt="NERVE"
          className="h-7 w-7 rounded-full border border-white/20"
        />
        <span className="text-sm font-semibold tracking-wide">NERVE v4</span>
      </div>

      <div className="mx-3 mb-2 h-px bg-white/8" />

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            onClick={onClose}
          />
        ))}

        {/* Startup OS section divider */}
        <div className="pt-3" />
        <div className="mx-0 mb-2 h-px bg-white/8" />

        {STARTUP_OS_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Bottom: Logout */}
      <div className="mx-3 mb-2 h-px bg-white/8" />
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-white/8 bg-[rgba(8,8,12,0.85)] backdrop-blur-xl md:flex md:flex-col">
        {sidebarContent()}
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/8 bg-[rgba(8,8,12,0.85)] px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/nerve-logo.jpg"
            alt="NERVE"
            className="h-7 w-7 rounded-full border border-white/20"
          />
          <span className="text-sm font-semibold tracking-wide">NERVE v4</span>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="min-h-10 min-w-10"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute inset-y-0 left-0 w-64 border-r border-white/8 bg-[rgba(8,8,12,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
