import OpenAI from "openai";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  return text.slice(start, end + 1);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    if (!process.env.OPENAI_API_KEY) {
      return fail("OPENAI_API_KEY is not configured", "INTERNAL_ERROR", 500);
    }

    const interview = await db.interview.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!interview) {
      return fail("Interview not found", "NOT_FOUND", 404);
    }

    if (!interview.transcript.trim()) {
      return fail("Transcript is required", "BAD_REQUEST", 400);
    }

    const assumptions = await db.assumption.findMany({
      orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }],
    });

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Extract structured insights and assumption updates. Return JSON only with keys: insights (array of {type, content}), assumptionsUpdated (array of {assumptionId, confidenceDelta, evidence}), summary (string). confidenceDelta can be negative or positive and should be within -20..20.",
        },
        {
          role: "user",
          content: `Interview transcript:\n${interview.transcript}\n\nKnown assumptions:\n${JSON.stringify(assumptions.map((a) => ({ id: a.id, title: a.title, description: a.description, status: a.status, confidence: a.confidence })), null, 2)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const json = extractJson(raw);
    if (!json) {
      return fail("Empty AI response", "INTERNAL_ERROR", 500);
    }

    const parsed = JSON.parse(json) as {
      insights: { type: string; content: string }[];
      assumptionsUpdated: { assumptionId: string; confidenceDelta: number; evidence: string }[];
      summary: string;
    };

    const insights = Array.isArray(parsed.insights) ? parsed.insights : [];
    const assumptionsUpdated = Array.isArray(parsed.assumptionsUpdated) ? parsed.assumptionsUpdated : [];

    const updates = [] as { assumptionId: string; confidenceDelta: number; evidence: string }[];
    for (const update of assumptionsUpdated) {
      const assumption = assumptions.find((a) => a.id === update.assumptionId);
      if (!assumption) continue;
      const delta = typeof update.confidenceDelta === "number" ? update.confidenceDelta : 0;
      const evidenceText = typeof update.evidence === "string" ? update.evidence.trim() : "";
      const nextConfidence = Math.max(0, Math.min(100, assumption.confidence + delta));
      const nextEvidence = evidenceText
        ? `${assumption.evidence ? `${assumption.evidence}\n` : ""}${evidenceText}`
        : assumption.evidence;

      await db.assumption.update({
        where: { id: assumption.id },
        data: {
          confidence: nextConfidence,
          ...(evidenceText ? { evidence: nextEvidence } : {}),
        },
      });

      updates.push({ assumptionId: assumption.id, confidenceDelta: delta, evidence: evidenceText });
    }

    await db.interview.update({
      where: { id },
      data: {
        insights: JSON.stringify(insights),
        assumptions: JSON.stringify(updates),
        status: "COMPLETED",
        completedAt: interview.completedAt ?? new Date(),
      },
    });

    return ok({ insights, assumptionsUpdated: updates, summary: parsed.summary ?? "" });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to process interview", "INTERNAL_ERROR", 500);
  }
}
