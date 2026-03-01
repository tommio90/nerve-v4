"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Contact,
  FileText,
  FlaskConical,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { NAV_ITEMS, STARTUP_OS_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/shared/sidebar-context";

const ICONS = {
  Bot,
  GitBranch,
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
  collapsed,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  const Icon = ICONS[icon as keyof typeof ICONS];

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center rounded-xl border transition-all duration-200",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "border-violet/40 bg-violet/15 text-foreground"
          : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="text-sm">{label}</span>}
    </Link>
  );
}

export function Sidebar({ onOpenSearch }: { onOpenSearch?: () => void } = {}) {
  const { collapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (forceExpanded = false, onClose?: () => void) => {
    const isCollapsed = forceExpanded ? false : collapsed;
    return (
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-4 py-5",
            isCollapsed && "justify-center px-0",
          )}
        >
          <img
            src="/nerve-logo.jpg"
            alt="NERVE"
            className="h-7 w-7 shrink-0 rounded-full border border-white/20"
          />
          {!isCollapsed && (
            <span className="text-sm font-semibold tracking-wide">NERVE v4</span>
          )}
        </div>

        <div className="mx-3 mb-2 h-px bg-white/8" />

        {/* Nav */}
        <nav
          className={cn(
            "flex-1 space-y-0.5 overflow-y-auto py-2",
            isCollapsed ? "px-2" : "px-3",
          )}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isCollapsed}
              onClick={onClose}
            />
          ))}

          <div className="pt-3" />
          <div className="mb-2 h-px bg-white/8" />

          {STARTUP_OS_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={isCollapsed}
              onClick={onClose}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className="mx-3 mb-1 h-px bg-white/8" />
        <div className={cn("pb-4", isCollapsed ? "px-2" : "px-3")}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={isCollapsed ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center rounded-xl border border-transparent py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-foreground",
              isCollapsed ? "justify-center px-0" : "gap-3 px-3",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/8 bg-[rgba(8,8,12,0.85)] backdrop-blur-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] md:flex",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {sidebarContent()}

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[rgba(8,8,12,0.95)] text-muted-foreground shadow-lg transition-all duration-200 hover:border-violet/40 hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
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
        <div className="flex items-center gap-1">
          {onOpenSearch && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-10 min-w-10"
              onClick={onOpenSearch}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="min-h-10 min-w-10"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute inset-y-0 left-0 w-64 border-r border-white/8 bg-[rgba(8,8,12,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent(true, () => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
