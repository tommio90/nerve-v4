import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  organization: z.string().optional(),
  personaId: z.string().optional().nullable(),
  pipelineStage: z.enum(["LEAD", "CONTACTED", "INTERVIEWED", "CUSTOMER", "ADVOCATE"]).optional(),
  notes: z.string().optional(),
  pains: z.array(z.string()).optional(),
  objections: z.array(z.string()).optional(),
  signals: z.array(z.string()).optional(),
  followUps: z.array(z.string()).optional(),
});

function safeParseArray(val: string): unknown[] {
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contact = await db.cRMContact.findUnique({
      where: { id },
      include: { interviews: true },
    });
    if (!contact) return fail("Contact not found", "NOT_FOUND", 404);
    return ok({ contact: normalize(contact) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load contact", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = patchSchema.parse(await request.json());
    const data: Record<string, unknown> = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.email !== undefined) data.email = payload.email || null;
    if (payload.linkedin !== undefined) data.linkedin = payload.linkedin;
    if (payload.twitter !== undefined) data.twitter = payload.twitter;
    if (payload.organization !== undefined) data.organization = payload.organization;
    if (payload.personaId !== undefined) data.personaId = payload.personaId;
    if (payload.pipelineStage !== undefined) data.pipelineStage = payload.pipelineStage;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.pains !== undefined) data.pains = JSON.stringify(payload.pains);
    if (payload.objections !== undefined) data.objections = JSON.stringify(payload.objections);
    if (payload.signals !== undefined) data.signals = JSON.stringify(payload.signals);
    if (payload.followUps !== undefined) data.followUps = JSON.stringify(payload.followUps);

    const contact = await db.cRMContact.update({ where: { id }, data });
    return ok({ contact: normalize(contact) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to update contact", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.cRMContact.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to delete contact", "INTERNAL_ERROR", 500);
  }
}
