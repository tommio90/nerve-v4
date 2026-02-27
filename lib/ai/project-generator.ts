import { db } from "@/lib/db";

export async function generateProjectProposals() {
  const snapshot = await db.contextSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
  const project = await db.project.create({
    data: {
      title: "Explore a high-leverage research initiative",
      description: "AI-generated strategic project proposal from latest context snapshot.",
      status: "PROPOSED",
      thesisScore: 0.78,
      scope: "M",
      reasoning: "Generated from current context to amplify curiosity and strategic momentum.",
      contextSnapshotId: snapshot?.id,
    },
  });
  return [project];
}
