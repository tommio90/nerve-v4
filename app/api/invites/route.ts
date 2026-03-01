import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const inviteSchema = z.object({
  email: z.string().email(),
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

export async function POST(request: Request) {
  const guard = await requireOwner();
  if ("error" in guard) return guard.error;

  try {
    const payload = inviteSchema.parse(await request.json());
    const email = payload.email.toLowerCase();

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const invite = await db.invite.create({
      data: {
        email,
        role: payload.role,
        expiresAt,
        invitedById: guard.session.user.id,
      },
    });

    const origin = request.headers.get("origin") || "";
    const inviteUrl = origin ? `${origin}/invite/${invite.token}` : `/invite/${invite.token}`;
    return NextResponse.json({ token: invite.token, inviteUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}

export async function GET() {
  const guard = await requireOwner();
  if ("error" in guard) return guard.error;

  try {
    const invites = await db.invite.findMany({
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }
}
