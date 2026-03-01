import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireOwner() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "OWNER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const guard = await requireOwner();
  if ("error" in guard) return guard.error;

  const { id } = context.params;
  try {
    await db.invite.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete invite" }, { status: 500 });
  }
}
