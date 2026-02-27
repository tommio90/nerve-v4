import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  archetype: z.string().optional(),
  demographics: z.record(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  pains: z.array(z.string()).optional(),
  behaviors: z.array(z.string()).optional(),
  dayInLife: z.string().optional(),
  aiAdoptionReadiness: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

function normalize(persona: {
  id: string;
  name: string;
  archetype: string;
  demographics: string;
  goals: string;
  pains: string;
  behaviors: string;
  dayInLife: string;
  aiAdoptionReadiness: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const safeParse = (value: string, fallback: unknown) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  return {
    ...persona,
    demographics: safeParse(persona.demographics, {}),
    goals: safeParse(persona.goals, []),
    pains: safeParse(persona.pains, []),
    behaviors: safeParse(persona.behaviors, []),
  };
}

export async function GET() {
  try {
    const personas = await db.persona.findMany({ orderBy: { updatedAt: "desc" } });
    return ok({ personas: personas.map(normalize) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load personas", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const persona = await db.persona.create({
      data: {
        name: payload.name,
        archetype: payload.archetype ?? "",
        demographics: JSON.stringify(payload.demographics ?? {}),
        goals: JSON.stringify(payload.goals ?? []),
        pains: JSON.stringify(payload.pains ?? []),
        behaviors: JSON.stringify(payload.behaviors ?? []),
        dayInLife: payload.dayInLife ?? "",
        aiAdoptionReadiness: payload.aiAdoptionReadiness ?? 0,
        notes: payload.notes ?? "",
      },
    });

    return ok({ persona: normalize(persona) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create persona", "INTERNAL_ERROR", 500);
  }
}
