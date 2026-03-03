import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const members = await db.orgMember.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ members });
  } catch (err) {
    console.error("[GET /api/org]", err);
    return NextResponse.json({ members: [], error: String(err) });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string | null>;
    const member = await db.orgMember.create({
      data: {
        name: body.name ?? "",
        role: body.role ?? "",
        department: body.department ?? undefined,
        type: body.type ?? "human",
        avatar: body.avatar ?? undefined,
        initials: body.initials ?? undefined,
        status: body.status ?? "active",
        parentId: body.parentId ?? undefined,
        metadata: body.metadata ?? "{}",
      },
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/org]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
