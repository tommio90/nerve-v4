import { db } from "@/lib/db";

export async function runContextScan() {
  const latest = await db.contextSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
  return db.contextSnapshot.create({
    data: {
      sources: JSON.stringify(["manual_scan"]),
      summary: "Manual context scan completed.",
      diffFromPrevious: latest ? "No external diff engine in Phase 1." : null,
    },
  });
}
