import { db } from "@/lib/db";

export async function decomposeProject(projectId: string) {
  const existing = await db.task.count({ where: { projectId } });
  if (existing > 0) {
    return db.task.findMany({ where: { projectId }, orderBy: { priority: "asc" } });
  }

  const tasks = [
    {
      projectId,
      title: "Research context",
      description: "Review available context and identify constraints.",
      deliverable: "Research notes",
      type: "RESEARCH" as const,
      modelTier: "DEEP" as const,
      status: "PROPOSED" as const,
      priority: 1,
    },
    {
      projectId,
      title: "Synthesize findings",
      description: "Convert research into clear strategic options.",
      deliverable: "Analysis memo",
      type: "ANALYSIS" as const,
      modelTier: "BALANCED" as const,
      status: "PROPOSED" as const,
      priority: 2,
    },
    {
      projectId,
      title: "Draft execution artifact",
      description: "Produce a usable first artifact from analysis.",
      deliverable: "Draft document",
      type: "CONTENT" as const,
      modelTier: "BALANCED" as const,
      status: "PROPOSED" as const,
      priority: 3,
    },
  ];

  return db.$transaction(tasks.map((task) => db.task.create({ data: task })));
}
