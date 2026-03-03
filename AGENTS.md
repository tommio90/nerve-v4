# NERVE v4 — AI Decision Intelligence Platform

## What This Is

A Next.js app (App Router) with Prisma + Turso (libsql), deployed on Vercel.
Single-user platform for AI-driven project management with approval flows.

## Stack

- Next.js 16+ (App Router, TypeScript)
- Prisma ORM with @prisma/adapter-libsql + Turso
- shadcn/ui + Tailwind CSS + Radix UI primitives
- OpenAI API (o3, GPT-4o, GPT-4o-mini)
- ElevenLabs TTS
- next-themes for light/dark mode toggling

## UI & Component Library

### shadcn/ui components (components/ui/)

All UI primitives use shadcn/ui (Radix-based). Installed components:
alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, input,
label, popover, progress, scroll-area, select, separator, sheet, sidebar,
skeleton, switch, table, tabs, textarea, toast, tooltip

When adding new UI primitives, use `npx shadcn@latest add <component>`.
Do NOT hand-roll components that shadcn/ui already provides.

### Layout

- `components/shared/app-shell.tsx` — wraps all authenticated pages with SidebarProvider
- `components/shared/sidebar.tsx` — main nav using shadcn Sidebar (sheet on mobile, collapsible on desktop)
- Mobile: sticky header with SidebarTrigger (hamburger) at top; sidebar opens as Sheet overlay
- Desktop: persistent collapsible sidebar (icon mode)
- Nav items close the mobile sheet on click via `setOpenMobile(false)`

### Theming & colors

- Light/dark mode via `next-themes` (class strategy). Provider in `components/shared/theme-provider.tsx`, toggle in sidebar footer
- CSS variables defined in `globals.css`: `:root` = light, `.dark` = dark. Both must be kept in sync when adding new variables
- All colors mapped in `tailwind.config.ts` under `theme.extend.colors`
- Use semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, `border-border`, etc.) — never hard-code hex/HSL values in components
- To add a new semantic color: add the CSS variable in both `:root` and `.dark` in `globals.css`, then map it in `tailwind.config.ts`
- Status colors (proposed, in-progress, complete, failed, deferred) are defined in `lib/constants.ts`

## Design Principles

- Information density over whitespace
- Progressive disclosure (summary first, detail on click)
- Light/dark theme toggle in sidebar; default is dark
- No loading spinners for < 500ms
- Mobile-responsive: all pages must work on small screens

## Read PRD.md for full requirements
