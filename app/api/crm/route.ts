import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  organization: z.string().optional(),
  personaId: z.string().optional(),
  pipelineStage: z.enum(["LEAD", "CONTACTED", "INTERVIEWED", "CUSTOMER", "ADVOCATE"]).optional(),
  notes: z.string().optional(),
});

function normalize(contact: {
  pains: string;
  objections: string;
  signals: string;
  followUps: string;
  [key: string]: unknown;
}) {
  return {
    ...contact,
    pains: safeParseArray(contact.pains),
    objections: safeParseArray(contact.objections),
    signals: safeParseArray(contact.signals),
    followUps: safeParseArray(contact.followUps),
  };
}

function safeParseArray(val: string): unknown[] {
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage") || undefined;

    const contacts = await db.cRMContact.findMany({
      where: stage ? { pipelineStage: stage } : {},
      include: { interviews: true },
      orderBy: { updatedAt: "desc" },
    });

    return ok({ contacts: contacts.map(normalize) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load contacts", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const contact = await db.cRMContact.create({
      data: {
        name: payload.name,
        email: payload.email || null,
        linkedin: payload.linkedin,
        twitter: payload.twitter,
        organization: payload.organization,
        personaId: payload.personaId,
        pipelineStage: payload.pipelineStage ?? "LEAD",
        notes: payload.notes ?? "",
      },
    });

    return ok({ contact: normalize(contact) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create contact", "INTERNAL_ERROR", 500);
  }
}
