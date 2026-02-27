import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  thesisScore: z.number().min(0).max(1),
  scope: z.enum(["S", "M", "L"]),
  reasoning: z.string().min(1),
  contextSnapshotId: z.string().optional(),
});

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: { tasks: true },
      orderBy: { updatedAt: "desc" },
    });
    return ok({ projects });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load projects", "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = projectSchema.parse(await request.json());
    
    // Create project
    const project = await db.project.create({
      data: {
        ...payload,
        status: "PROPOSED",
      },
    });

    // Auto-generate whitepaper doc
    const whitepaperContent = `# ${payload.title} - Whitepaper

## Executive Summary
${payload.description}

## Thesis Alignment
**Thesis Score:** ${(payload.thesisScore * 100).toFixed(0)}%

${payload.reasoning}

## Strategic Context
This project was created as part of the NERVE v3 decision intelligence framework. It represents ${payload.scope === 'S' ? 'a small, tactical initiative' : payload.scope === 'M' ? 'a medium-sized strategic initiative' : 'a large, transformative initiative'}.

## Core Thesis
**"AI optimizes within distributions. Humans expand distributions. The future belongs to those who cultivate curiosity."**

### Evaluation Lens
Does this project amplify human curiosity or reduce humans to optimizers?

The council will evaluate this project through the lens of:
- **Distribution Expansion:** Does it create new markets, models, or approaches?
- **Curiosity Amplification:** Does it enable exploration over optimization?
- **Human Agency:** Does it preserve and enhance human decision-making capacity?
- **Long-term Value:** Does it build durable advantages or temporary efficiencies?

## Next Steps
1. Council review and approval
2. Task breakdown and execution planning
3. Resource allocation and timeline definition
4. Success metrics and measurement framework

---

*Generated: ${new Date().toISOString()}*  
*Project ID: ${project.id}*  
*Status: PROPOSED*`;

    // Create whitepaper doc
    const whitepaperDoc = await db.doc.create({
      data: {
        title: `${payload.title} - Whitepaper`,
        summary: `Project whitepaper: ${payload.description.slice(0, 150)}${payload.description.length > 150 ? '...' : ''}`,
        content: whitepaperContent,
        category: "whitepaper",
        venture: "NERVE",
        source: "auto-generated",
        tags: serializeTags(
          buildDocTags({
            title: `${payload.title} - Whitepaper`,
            content: whitepaperContent,
            category: "whitepaper",
            venture: "NERVE",
            source: "auto-generated",
            requiredTags: ["project-doc"],
          }),
        ),
      },
    });

    // Link whitepaper to project
    await db.project.update({
      where: { id: project.id },
      data: { whitepaperDocId: whitepaperDoc.id },
    });

    return ok({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail("Invalid payload", "BAD_REQUEST", 400, error.flatten());
    }
    return fail(error instanceof Error ? error.message : "Failed to create project", "INTERNAL_ERROR", 500);
  }
}
