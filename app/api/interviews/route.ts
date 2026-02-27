import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  contactId: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
  questions: z.array(z.string()).optional(),
  transcript: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

function safeParseArray(val: string): unknown[] {
  try {
    const p = JSON.parse(val);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function normalize(interview: {
  questions: string;
  insights: string;
  assumptions: string;
  [key: string]: unknown;
}) {
  return {
    ...interview,
    questions: safeParseArray(interview.questions),
    insights: safeParseArray(interview.insights),
    assumptions: safeParseArray(interview.assumptions),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const contactId = searchParams.get("contactId") || undefined;

    const interviews = await db.interview.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(contactId ? { contactId } : {}),
      },
      include: {
        contact: { select: { id: true, name: true, organization: true, email: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    return ok({ interviews: interviews.map(normalize) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load interviews", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const interview = await db.interview.create({
      data: {
        contactId: payload.contactId,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        questions: JSON.stringify(payload.questions ?? []),
        transcript: payload.transcript ?? "",
        status: payload.status ?? "SCHEDULED",
      },
      include: {
        contact: { select: { id: true, name: true, organization: true, email: true } },
      },
    });

    return ok({ interview: normalize(interview) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create interview", "INTERNAL_ERROR", 500);
  }
}
