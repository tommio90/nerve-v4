"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Contact,
  FileText,
  FlaskConical,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Search,
  Sun,
  Target,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { NAV_ITEMS, STARTUP_OS_ITEMS } from "@/lib/constants";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
};

export function AppSidebar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <Link href="/" className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
            <img
              src="/nerve-logo.jpg"
              alt="NERVE"
              className="h-7 w-7 shrink-0 rounded-full border border-border"
            />
            <span className="text-sm font-semibold tracking-wide">
              NERVE v4
            </span>
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Startup OS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {STARTUP_OS_ITEMS.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          {onOpenSearch && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onOpenSearch} tooltip="Search">
                <Search className="h-4 w-4" />
                <span>Search</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span>Theme</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut({ callbackUrl: "/login" })}
              tooltip="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
