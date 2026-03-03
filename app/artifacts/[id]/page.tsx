import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

export default async function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id }, include: { project: true, task: true } });

  if (!artifact) {
    notFound();
  }

  return (
    <div className="synapse-page space-y-4">
      <h1 className="title-3">{artifact.title}</h1>
      <Card className="p-0">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{artifact.type}</Badge>
            <Badge variant="outline">{artifact.mimeType}</Badge>
            <span className="text-caption">Project: {artifact.project.title}</span>
          </div>
        </CardHeader>
        <CardContent>
          {artifact.content ? (
            <article className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.content}</ReactMarkdown>
            </article>
          ) : (
            <p className="text-subtle">No inline content available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
