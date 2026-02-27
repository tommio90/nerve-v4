import { NextRequest, NextResponse } from "next/server";
import { listSkills, createSkill } from "@/lib/db";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const skills = await listSkills({ status });
  return NextResponse.json({ skills });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.string().optional(),
  models: z.string().optional(),
  config: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = createSchema.parse(await request.json());
    const skill = await createSkill(parsed);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create skill" }, { status: 500 });
  }
}
