import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = (await req.json()) as Record<string, string | null | undefined>;
    const allowed = ["name", "role", "department", "type", "avatar", "initials", "status", "parentId"] as const;
    const data: Record<string, string | null> = {};
    for (const k of allowed) {
      if (k in body) data[k] = body[k] === undefined ? null : (body[k] as string | null);
    }
    if ("metadata" in body) {
      data.metadata = typeof body.metadata === "string" ? body.metadata : JSON.stringify(body.metadata);
    }
    const member = await db.orgMember.update({ where: { id }, data });
    return NextResponse.json({ member });
  } catch (err) {
    console.error("[PATCH /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const existing = await db.orgMember.findUnique({ where: { id }, select: { parentId: true } });
    if (existing) {
      await db.orgMember.updateMany({ where: { parentId: id }, data: { parentId: existing.parentId } });
    }
    await db.orgMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
