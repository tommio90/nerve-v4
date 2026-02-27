export type DocTagContext = {
  title?: string | null;
  content?: string | null;
  category?: string | null;
  source?: string | null;
  venture?: string | null;
  existingTags?: string[];
  requiredTags?: string[];
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "being",
  "below",
  "could",
  "first",
  "from",
  "have",
  "into",
  "other",
  "should",
  "their",
  "there",
  "these",
  "those",
  "through",
  "using",
  "with",
  "your",
  "this",
  "that",
  "what",
  "where",
  "when",
  "which",
  "while",
  "project",
  "document",
]);

const KEYWORD_TAGS: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "research", pattern: /\bresearch\b/i },
  { tag: "strategy", pattern: /\bstrategy\b/i },
  { tag: "analysis", pattern: /\banalysis\b/i },
  { tag: "roadmap", pattern: /\broadmap\b/i },
  { tag: "metrics", pattern: /\b(kpi|metric|measurement)\b/i },
  { tag: "risk", pattern: /\b(risk|risks)\b/i },
  { tag: "architecture", pattern: /\b(architecture|system design)\b/i },
  { tag: "api", pattern: /\bapi\b/i },
  { tag: "product", pattern: /\bproduct\b/i },
  { tag: "growth", pattern: /\bgrowth\b/i },
  { tag: "finance", pattern: /\b(finance|financial|budget)\b/i },
  { tag: "whitepaper", pattern: /\bwhitepaper\b/i },
  { tag: "transcript", pattern: /\btranscript\b/i },
  { tag: "memory", pattern: /\bmemory\b/i },
];

function normalizeTag(raw: string): string | null {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 1 ? normalized : null;
}

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];

  try {
    const parsed = JSON.parse(tags) as unknown;
    if (!Array.isArray(parsed)) return [];

    const clean = new Set<string>();
    for (const value of parsed) {
      if (typeof value !== "string") continue;
      const tag = normalizeTag(value);
      if (tag) clean.add(tag);
    }

    return [...clean];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify([...new Set(tags)]);
}

function inferSourceTags(ctx: Omit<DocTagContext, "existingTags" | "requiredTags">): string[] {
  const source = (ctx.source || "").toLowerCase();
  const category = (ctx.category || "").toLowerCase();
  const tags: string[] = [];

  if (source === "prompt" || source === "lobster" || category === "generated") tags.push("ai-generated");
  if (source.includes("youtube.com") || source.includes("youtu.be") || category === "youtube") tags.push("youtube-transcript");
  if (source.startsWith("memory/") || source === "memory.md" || category === "memory") tags.push("memory-doc");
  if (category === "task_execution_research") tags.push("task-research");
  if (category === "whitepaper") tags.push("project-doc");

  return tags;
}

function inferContextTags(ctx: Omit<DocTagContext, "existingTags" | "requiredTags">): string[] {
  const tags = new Set<string>();
  const title = ctx.title || "";
  const content = ctx.content || "";
  const combined = `${title}\n${content}`;

  for (const rule of KEYWORD_TAGS) {
    if (rule.pattern.test(combined)) {
      tags.add(rule.tag);
    }
  }

  if (ctx.category) {
    const categoryTag = normalizeTag(`category-${ctx.category}`);
    if (categoryTag) tags.add(categoryTag);
  }

  if (ctx.venture) {
    const ventureTag = normalizeTag(`venture-${ctx.venture}`);
    if (ventureTag) tags.add(ventureTag);
  }

  const topTitleTokens = (title.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])
    .filter((word) => !STOP_WORDS.has(word))
    .slice(0, 3);

  for (const token of topTitleTokens) {
    const topicTag = normalizeTag(`topic-${token}`);
    if (topicTag) tags.add(topicTag);
  }

  return [...tags];
}

export function buildDocTags(ctx: DocTagContext): string[] {
  const all = new Set<string>();

  for (const raw of ctx.requiredTags || []) {
    const tag = normalizeTag(raw);
    if (tag) all.add(tag);
  }

  for (const raw of ctx.existingTags || []) {
    const tag = normalizeTag(raw);
    if (tag) all.add(tag);
  }

  for (const raw of inferSourceTags(ctx)) {
    const tag = normalizeTag(raw);
    if (tag) all.add(tag);
  }

  for (const raw of inferContextTags(ctx)) {
    const tag = normalizeTag(raw);
    if (tag) all.add(tag);
  }

  return [...all].sort();
}
