import OpenAI from "openai";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

function getClient() { return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); }

const requestSchema = z.object({
  description: z.string().min(8).max(4000),
});

const personaSchema = z.object({
  name: z.string().min(1),
  archetype: z.string().default(""),
  demographics: z.record(z.string()).default({}),
  goals: z.array(z.string()).default([]),
  pains: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
  dayInLife: z.string().default(""),
  aiAdoptionReadiness: z.number().min(0).max(100).default(0),
  notes: z.string().default(""),
});

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  return text.slice(start, end + 1);
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return fail("OPENAI_API_KEY is not configured", "INTERNAL_ERROR", 500);
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Invalid payload", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Return a single JSON object with keys: name, archetype, demographics (object with ageRange, location, jobTitle, income), goals (array), pains (array), behaviors (array), dayInLife, aiAdoptionReadiness (0-100), notes. JSON only.",
        },
        {
          role: "user",
          content: `Generate a persona from this description:\n\n${parsed.data.description}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const json = extractJson(raw);
    if (!json) {
      return fail("Empty AI response", "INTERNAL_ERROR", 500);
    }

    const parsedPersona = personaSchema.safeParse(JSON.parse(json));
    if (!parsedPersona.success) {
      return fail("Invalid persona format", "INTERNAL_ERROR", 500, parsedPersona.error.flatten());
    }

    const persona = await db.persona.create({
      data: {
        name: parsedPersona.data.name,
        archetype: parsedPersona.data.archetype ?? "",
        demographics: JSON.stringify(parsedPersona.data.demographics ?? {}),
        goals: JSON.stringify(parsedPersona.data.goals ?? []),
        pains: JSON.stringify(parsedPersona.data.pains ?? []),
        behaviors: JSON.stringify(parsedPersona.data.behaviors ?? []),
        dayInLife: parsedPersona.data.dayInLife ?? "",
        aiAdoptionReadiness: parsedPersona.data.aiAdoptionReadiness ?? 0,
        notes: parsedPersona.data.notes ?? "",
      },
    });

    return ok({ persona: {
      ...persona,
      demographics: parsedPersona.data.demographics ?? {},
      goals: parsedPersona.data.goals ?? [],
      pains: parsedPersona.data.pains ?? [],
      behaviors: parsedPersona.data.behaviors ?? [],
    } }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to generate persona", "INTERNAL_ERROR", 500);
  }
}
