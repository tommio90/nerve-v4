import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "@/lib/db";
import { parseTags } from "@/lib/doc-tags";

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
          <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
            {doc.source ? <span className="rounded-full border border-zinc-800 px-3 py-1">Source: {doc.source}</span> : null}
            {doc.venture ? <span className="rounded-full border border-zinc-800 px-3 py-1">Venture: {doc.venture}</span> : null}
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-300">#{tag}</span>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-6">
          <article className="prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
          </article>
        </section>

        <footer className="pt-6 text-xs text-zinc-500">
          <a href="https://nerve-v3.vercel.app" className="transition hover:text-zinc-300">
            Created with NERVE
          </a>
        </footer>
      </div>
    </div>
  );
}
