import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "@/lib/db";
import { parseTags } from "@/lib/doc-tags";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default async function SharedDocPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await db.doc.findFirst({
    where: { shareToken: token, isPublic: true },
  });

  if (!doc) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold">This document is not available</h1>
          <p className="mt-2 text-sm text-zinc-400">The link may be invalid or sharing has been disabled.</p>
        </div>
      </div>
    );
  }

  const tags = parseTags(doc.tags);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Shared Document</p>
          <h1 className="text-3xl font-semibold leading-tight text-zinc-100">{doc.title}</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            {doc.source ? <Badge variant="outline">Source: {doc.source}</Badge> : null}
            {doc.venture ? <Badge variant="outline">Venture: {doc.venture}</Badge> : null}
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-zinc-300">#{tag}</Badge>
            ))}
          </div>
        </header>

        <Card className="border-zinc-900 bg-zinc-950/60 p-6">
          <article className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
          </article>
        </Card>

        <footer className="pt-6 text-xs text-zinc-500">
          <a href="https://nerve-v3.vercel.app" className="transition hover:text-zinc-300">
            Created with NERVE
          </a>
        </footer>
      </div>
    </div>
  );
}
