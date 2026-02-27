import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const messages = await db.docMessage.findMany({
      where: { docId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[GET /api/docs/[id]/messages]", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { role, content } = (await req.json()) as {
      role: string;
      content: string;
    };

    if (!role || !content) {
      return NextResponse.json(
        { error: "Missing role or content" },
        { status: 400 }
      );
    }

    const message = await db.docMessage.create({
      data: {
        docId: id,
        role,
        content,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[POST /api/docs/[id]/messages]", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
