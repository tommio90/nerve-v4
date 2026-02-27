import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const persona = await db.persona.findUnique({ where: { id } });
    if (!persona) {
      return fail("Persona not found", "NOT_FOUND", 404);
    }
    return ok({ persona: normalize(persona) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load persona", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const payload = updateSchema.parse(await request.json());
    const persona = await db.persona.update({
      where: { id },
      data: {
        name: payload.name,
        archetype: payload.archetype,
        demographics: payload.demographics ? JSON.stringify(payload.demographics) : undefined,
        goals: payload.goals ? JSON.stringify(payload.goals) : undefined,
        pains: payload.pains ? JSON.stringify(payload.pains) : undefined,
        behaviors: payload.behaviors ? JSON.stringify(payload.behaviors) : undefined,
        dayInLife: payload.dayInLife,
        aiAdoptionReadiness: payload.aiAdoptionReadiness,
        notes: payload.notes,
      },
    });

    return ok({ persona: normalize(persona) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update persona", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await db.persona.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete persona", "INTERNAL_ERROR", 500);
  }
}
