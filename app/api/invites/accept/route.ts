import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const payload = acceptSchema.parse(await request.json());
    const invite = await db.invite.findUnique({ where: { token: payload.token } });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "Invite already used" }, { status: 409 });
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    const existingUser = await db.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const [user] = await db.$transaction([
      db.user.create({
        data: {
          name: payload.name.trim(),
          email: invite.email,
          passwordHash,
          role: invite.role,
        },
      }),
      db.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
