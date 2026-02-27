import { notFound } from "next/navigation";
import { DocDetailClient } from "@/components/docs/doc-detail-client";
import { db } from "@/lib/db";

export default async function DocDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await db.doc.findUnique({ where: { id } });

  if (!doc) {
    notFound();
  }

  return <DocDetailClient doc={{ ...doc, createdAt: doc.createdAt.toISOString() }} />;
}
