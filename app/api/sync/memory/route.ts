import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { buildDocTags, parseTags, serializeTags } from "@/lib/doc-tags";

const MEMORY_DIR = "/Users/giuseppetomasello/.openclaw/workspace/memory";
const MEMORY_MD = "/Users/giuseppetomasello/.openclaw/workspace/MEMORY.md";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = { synced: 0, skipped: 0, errors: 0, files: [] as string[] };

    // Sync individual memory/*.md files
    let files: string[] = [];
    try {
      files = (await readdir(MEMORY_DIR)).filter((f) => f.endsWith(".md"));
    } catch {
      // directory might not exist
    }

    for (const file of files) {
      try {
        const filePath = join(MEMORY_DIR, file);
        const content = await readFile(filePath, "utf-8");
        const fileStat = await stat(filePath);
        const title = file.replace(/\.md$/, "");

        // Check if doc already exists by source path
        const existing = await db.doc.findFirst({
          where: { source: `memory/${file}` },
        });

        if (existing) {
          // Update only if file was modified after last sync
          const fileModified = fileStat.mtime;
          const docUpdated = new Date(existing.updatedAt);

          if (fileModified > docUpdated) {
            const formattedTitle = formatTitle(title);
            const tags = buildDocTags({
              title: formattedTitle,
              content,
              category: "memory",
              source: `memory/${file}`,
              existingTags: parseTags(existing.tags),
              requiredTags: ["memory-doc"],
            });
            await db.doc.update({
              where: { id: existing.id },
              data: {
                content,
                title: formattedTitle,
                category: "memory",
                tags: serializeTags(tags),
                updatedAt: fileModified,
              },
            });
            results.synced++;
            results.files.push(file);
          } else {
            results.skipped++;
          }
        } else {
          // Create new doc
          const createdAt = parseDateFromFilename(title) || fileStat.birthtime;
          const formattedTitle = formatTitle(title);
          await db.doc.create({
            data: {
              title: formattedTitle,
              content,
              category: "memory",
              source: `memory/${file}`,
              tags: serializeTags(
                buildDocTags({
                  title: formattedTitle,
                  content,
                  category: "memory",
                  source: `memory/${file}`,
                  requiredTags: ["memory-doc"],
                }),
              ),
              createdAt,
            },
          });
          results.synced++;
          results.files.push(file);
        }
      } catch {
        results.errors++;
      }
    }

    // Sync MEMORY.md (long-term memory)
    try {
      const content = await readFile(MEMORY_MD, "utf-8");
      const fileStat = await stat(MEMORY_MD);
      const existing = await db.doc.findFirst({
        where: { source: "MEMORY.md" },
      });

      if (existing) {
        if (fileStat.mtime > new Date(existing.updatedAt)) {
          const tags = buildDocTags({
            title: existing.title,
            content,
            category: "memory",
            source: "MEMORY.md",
            existingTags: parseTags(existing.tags),
            requiredTags: ["memory-doc"],
          });
          await db.doc.update({
            where: { id: existing.id },
            data: {
              content,
              category: "memory",
              tags: serializeTags(tags),
              updatedAt: fileStat.mtime,
            },
          });
          results.synced++;
          results.files.push("MEMORY.md");
        } else {
          results.skipped++;
        }
      } else {
        await db.doc.create({
          data: {
            title: "Long-Term Memory",
            content,
            category: "memory",
            source: "MEMORY.md",
            tags: serializeTags(
              buildDocTags({
                title: "Long-Term Memory",
                content,
                category: "memory",
                source: "MEMORY.md",
                requiredTags: ["memory-doc"],
              }),
            ),
          },
        });
        results.synced++;
        results.files.push("MEMORY.md");
      }
    } catch {
      results.errors++;
    }

    return NextResponse.json({
      ok: true,
      ...results,
      total: files.length + 1,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

function formatTitle(filename: string): string {
  // "2026-02-11" → "Daily Notes — Feb 11, 2026"
  const dateMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const d = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00`);
    return `Daily Notes — ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  // "2026-02-10-perlea-whitepaper" → "Feb 10 — Perlea Whitepaper"
  const namedMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (namedMatch) {
    const d = new Date(`${namedMatch[1]}-${namedMatch[2]}-${namedMatch[3]}T00:00:00`);
    const label = namedMatch[4].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${label}`;
  }
  return filename;
}

function parseDateFromFilename(filename: string): Date | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  return null;
}
