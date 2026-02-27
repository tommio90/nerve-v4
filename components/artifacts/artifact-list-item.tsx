import Link from "next/link";

export function ArtifactListItem({ id, title, meta }: { id: string; title: string; meta: string }) {
  return (
    <Link href={`/artifacts/${id}`} className="block rounded border p-2 text-sm hover:bg-muted">
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{meta}</p>
    </Link>
  );
}
