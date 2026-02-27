#!/usr/bin/env node
/**
 * Syncs memory/*.md + MEMORY.md → NERVE v3 Docs via API
 * Usage: node scripts/sync-memory.mjs [base_url]
 */
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

const BASE_URL = process.argv[2] || "https://nerve-v3.vercel.app";
const MEMORY_DIR = "/Users/giuseppetomasello/.openclaw/workspace/memory";
const MEMORY_MD = "/Users/giuseppetomasello/.openclaw/workspace/MEMORY.md";

function formatTitle(filename) {
  const dateMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const d = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00`);
    return `Daily Notes — ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  const namedMatch = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (namedMatch) {
    const d = new Date(`${namedMatch[1]}-${namedMatch[2]}-${namedMatch[3]}T00:00:00`);
    const label = namedMatch[4].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${label}`;
  }
  return filename;
}

async function getExistingDocs() {
  const res = await fetch(`${BASE_URL}/api/docs`);
  const data = await res.json();
  const docs = data.docs || [];
  const bySource = new Map();
  for (const doc of docs) {
    if (doc.source) bySource.set(doc.source, doc);
  }
  return bySource;
}

async function syncFile(filepath, title, source, existingMap) {
  const content = await readFile(filepath, "utf-8");
  const existing = existingMap.get(source);

  if (existing) {
    // Update
    const res = await fetch(`${BASE_URL}/api/docs/${existing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) return "updated";
    return "error";
  } else {
    // Create
    const res = await fetch(`${BASE_URL}/api/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category: "memory", source }),
    });
    if (res.ok) return "created";
    return "error";
  }
}

async function main() {
  console.log(`Syncing memory to ${BASE_URL}...`);
  const existingMap = await getExistingDocs();
  let synced = 0, skipped = 0, errors = 0;

  // Sync memory/*.md
  try {
    const files = (await readdir(MEMORY_DIR)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const filepath = join(MEMORY_DIR, file);
      const title = formatTitle(file.replace(/\.md$/, ""));
      const result = await syncFile(filepath, title, `memory/${file}`, existingMap);
      if (result === "error") errors++;
      else synced++;
    }
  } catch (e) {
    console.error("Error reading memory dir:", e.message);
  }

  // Sync MEMORY.md
  try {
    const result = await syncFile(MEMORY_MD, "Long-Term Memory", "MEMORY.md", existingMap);
    if (result === "error") errors++;
    else synced++;
  } catch (e) {
    console.error("Error syncing MEMORY.md:", e.message);
  }

  console.log(`✅ Done: ${synced} synced, ${errors} errors`);
}

main().catch(console.error);
