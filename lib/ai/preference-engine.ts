import { db } from "@/lib/db";

export async function analyzePreferences() {
  const approvals = await db.decision.count({ where: { action: "APPROVE" } });
  const rejects = await db.decision.count({ where: { action: "REJECT" } });
  const total = approvals + rejects;
  const approvalRate = total === 0 ? 0.5 : approvals / total;

  // Clean up duplicates first
  await deduplicatePreferences();

  // Use transaction to ensure consistency
  return db.$transaction(async (tx) => {
    // Find existing by dimension (not by id)
    const existing = await tx.preferenceVector.findFirst({
      where: { dimension: "approval_rate" },
    });

    const data = {
      dimension: "approval_rate",
      value: approvalRate,
      confidence: Math.min(1, total / 20),
      sampleSize: total,
      reasoning: "Derived from decision history.",
    };

    if (existing) {
      return tx.preferenceVector.update({
        where: { id: existing.id },
        data,
      });
    }

    return tx.preferenceVector.create({
      data: {
        id: "approval-rate",
        ...data,
      },
    });
  });
}

async function deduplicatePreferences() {
  const dimensions = await db.preferenceVector.findMany({
    select: { dimension: true },
  });

  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const pref of dimensions) {
    if (seen.has(pref.dimension)) {
      duplicates.push(pref.dimension);
    } else {
      seen.add(pref.dimension);
    }
  }

  // For each duplicate dimension, keep only the most recent one
  for (const dim of duplicates) {
    const allForDim = await db.preferenceVector.findMany({
      where: { dimension: dim },
      orderBy: { updatedAt: "desc" },
    });

    if (allForDim.length > 1) {
      const idsToDelete = allForDim.slice(1).map((p) => p.id);
      await db.preferenceVector.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }
}
