# NERVE v3 — AI Decision Intelligence Platform

## What This Is
A Next.js app (App Router) with Prisma + Turso (libsql), deployed on Vercel.
Single-user platform for AI-driven project management with approval flows.

## Stack
- Next.js 16+ (App Router, TypeScript)
- Prisma ORM with @prisma/adapter-libsql + Turso
- shadcn/ui + Tailwind CSS
- OpenAI API (o3, GPT-4o, GPT-4o-mini)
- ElevenLabs TTS
- Dark mode default

## Design Principles
- Information density over whitespace
- Progressive disclosure (summary first, detail on click)
- Status = color: blue=proposed, yellow=in-progress, green=complete, red=failed, gray=deferred
- Dark mode default
- No loading spinners for < 500ms

## Read PRD.md for full requirements
