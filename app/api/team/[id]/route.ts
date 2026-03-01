import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const roleSchema = z.object({
  role: z.enum(["OWNER", "MEMBER", "VIEWER"]),
});

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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const guard = await requireOwner();
  if ("error" in guard) return guard.error;

  try {
    const payload = roleSchema.parse(await request.json());
    const { id } = context.params;

    const user = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role === "OWNER") {
      return NextResponse.json({ error: "Cannot change OWNER" }, { status: 403 });
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: payload.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const guard = await requireOwner();
  if ("error" in guard) return guard.error;

  const { id } = context.params;
  try {
    const user = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role === "OWNER") {
      return NextResponse.json({ error: "Cannot delete OWNER" }, { status: 403 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
