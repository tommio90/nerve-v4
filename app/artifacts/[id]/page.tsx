import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id }, include: { project: true, task: true } });

  if (!artifact) {
    notFound();
  }

  return (
    <div className="synapse-page space-y-4">
      <h1 className="synapse-heading">{artifact.title}</h1>
      <Card className="space-y-2">
        <p className="text-xs text-muted-foreground">{artifact.type} · {artifact.mimeType} · Project: {artifact.project.title}</p>
        {artifact.content ? (
          <article className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">No inline content available.</p>
        )}
      </Card>
    </div>
  );
}
