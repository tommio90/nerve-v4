import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { buildDocTags, serializeTags } from "@/lib/doc-tags";

export const runtime = "nodejs";
export const maxDuration = 180;

const requestSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
});

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }

    if (hostname.includes("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return fromQuery;

      const segments = parsed.pathname.split("/").filter(Boolean);
      const shortsIndex = segments.indexOf("shorts");
      if (shortsIndex >= 0 && segments[shortsIndex + 1]) return segments[shortsIndex + 1];

      const embedIndex = segments.indexOf("embed");
      if (embedIndex >= 0 && segments[embedIndex + 1]) return segments[embedIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

async function getVideoMetadata(videoId: string): Promise<{ title: string; description: string } | null> {
  try {
    // Use YouTube oEmbed API (no API key required)
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      title: data.title || `YouTube Video ${videoId}`,
      description: data.author_name ? `By ${data.author_name}` : ""
    };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function normalizeTranscript(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractTextFromNode(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const data = node as { simpleText?: string; runs?: Array<{ text?: string }> };
  if (data.simpleText) return data.simpleText;
  if (data.runs?.length) return data.runs.map((run) => run.text ?? "").join("");
  return null;
}

function collectTranscriptSegments(node: unknown, out: string[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTranscriptSegments(item, out));
    return;
  }

  const data = node as Record<string, unknown>;
  const segment = data.transcriptSegmentRenderer as Record<string, unknown> | undefined;
  if (segment) {
    const snippet = segment.snippet as Record<string, unknown> | undefined;
    const text = extractTextFromNode(snippet) ?? extractTextFromNode(segment);
    if (text) out.push(text);
  }

  const cue = data.transcriptCueRenderer as Record<string, unknown> | undefined;
  if (cue) {
    const cueText = extractTextFromNode(cue.cue) ?? extractTextFromNode(cue);
    if (cueText) out.push(cueText);
  }

  Object.values(data).forEach((value) => collectTranscriptSegments(value, out));
}

function extractTranscriptFromInnertubeResponse(data: unknown): string | null {
  const segments: string[] = [];
  collectTranscriptSegments(data, segments);
  if (!segments.length) return null;
  return normalizeTranscript(segments.join(" "));
}

async function fetchTranscriptFromInnertube(videoId: string): Promise<string | null> {
  try {
    const response = await fetch("https://www.youtube.com/youtubei/v1/get_transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240201.00.00",
          },
        },
        videoId,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return extractTranscriptFromInnertubeResponse(data);
  } catch {
    return null;
  }
}

function extractCaptionTracks(html: string): Array<{ baseUrl: string; languageCode?: string }> | null {
  const match = html.match(/"captionTracks":(\[.*?\])/s);
  if (!match) return null;
  try {
    const tracks = JSON.parse(match[1]) as Array<{ baseUrl: string; languageCode?: string }>;
    return tracks.length ? tracks : null;
  } catch {
    return null;
  }
}

function parseTimedTextResponse(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed) as { events?: Array<{ segs?: Array<{ utf8?: string }> }> };
      const parts: string[] = [];
      data.events?.forEach((event) => {
        event.segs?.forEach((seg) => {
          if (seg.utf8) parts.push(seg.utf8);
        });
      });
      if (!parts.length) return null;
      return normalizeTranscript(parts.join(" "));
    } catch {
      return null;
    }
  }

  const parts = Array.from(trimmed.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)).map((match) =>
    decodeHtmlEntities(match[1])
  );
  if (!parts.length) return null;
  return normalizeTranscript(parts.join(" "));
}

async function fetchTranscriptFromPage(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!response.ok) return null;
    const html = await response.text();
    const tracks = extractCaptionTracks(html);
    if (!tracks?.length) return null;

    const preferred =
      tracks.find((track) => track.languageCode?.startsWith("en")) ??
      tracks.find((track) => track.languageCode) ??
      tracks[0];

    if (!preferred?.baseUrl) return null;
    const timedText = await fetch(preferred.baseUrl);
    if (!timedText.ok) return null;
    const timedTextBody = await timedText.text();
    return parseTimedTextResponse(timedTextBody);
  } catch {
    return null;
  }
}

async function getTranscript(videoId: string): Promise<{ text: string; source: "innertube" | "watch-page" } | null> {
  const innertube = await fetchTranscriptFromInnertube(videoId);
  if (innertube) return { text: innertube, source: "innertube" };

  const fallback = await fetchTranscriptFromPage(videoId);
  if (fallback) return { text: fallback, source: "watch-page" };

  return null;
}

async function extractWithGemini(
  transcript: string,
  metadata: { title: string; description: string } | null
): Promise<{ content: string; title: string; summary: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }

  try {
    const metadataLine = metadata?.description ? `Channel: ${metadata.description}` : "Channel: Unknown";
    const titleLine = metadata?.title ? `Title: ${metadata.title}` : "Title: Unknown";

    // Use Gemini 2.5 Flash with transcript input
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are structuring a YouTube transcript for documentation.

Create a well-organized document with:
1. A concise overview
2. Key points and insights
3. Structured sections that mirror the flow of the content
4. Actionable takeaways or notable quotes if present

Format your response as a clean document with headings and bullet points where helpful.`
                },
                { text: `${titleLine}\n${metadataLine}` },
                { text: `Transcript:\n${transcript}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8000,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content || content.length < 100) {
      throw new Error("Gemini returned empty or very short content");
    }

    return {
      content,
      title: metadata?.title || "YouTube Video",
      summary: `Extracted using Gemini transcript analysis${metadata?.description ? ` - ${metadata.description}` : ""}`
    };
  } catch (error) {
    console.error("Gemini extraction error:", error);
    throw error;
  }
}

function buildManualDoc(url: string, videoId: string, metadata: { title: string; description: string } | null, error: string): string {
  return [
    `# ${metadata?.title || `YouTube Video ${videoId}`}`,
    "",
    `**Video URL:** ${url}`,
    metadata?.description ? `**Channel:** ${metadata.description}` : "",
    "",
    "---",
    "",
    "## Content Unavailable",
    "",
    "This video's content could not be automatically extracted.",
    "",
    "**Reason:** " + error,
    "",
    "**To view the video:**",
    `- [Watch on YouTube](${url})`,
    "",
    "---",
    "",
    "## Manual Notes",
    "",
    "_Add your notes about this video here..._",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMetadataDoc(url: string, videoId: string, metadata: { title: string; description: string } | null): string {
  return [
    `# ${metadata?.title || `YouTube Video ${videoId}`}`,
    "",
    `**Video URL:** ${url}`,
    metadata?.description ? `**Channel:** ${metadata.description}` : "",
    "",
    "---",
    "",
    "## Transcript Unavailable",
    "",
    "A transcript could not be found for this video. This document contains only basic metadata.",
    "",
    "**To view the video:**",
    `- [Watch on YouTube](${url})`,
    "",
    "---",
    "",
    "## Manual Notes",
    "",
    "_Add your notes about this video here..._",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail("Invalid payload", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const { url, title: userTitle } = parsed.data;
    const videoId = extractVideoId(url);

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return fail("Invalid YouTube URL or video ID", "BAD_REQUEST", 400);
    }

    let finalTitle: string;
    let finalContent: string;
    let finalSummary: string;
    let success = false;
    let errorMessage: string | null = null;

    // Get basic metadata first
    const metadata = await getVideoMetadata(videoId);
    const transcript = await getTranscript(videoId);

    if (transcript) {
      try {
        const result = await extractWithGemini(transcript.text, metadata);
        
        if (result) {
          finalTitle = userTitle || result.title || metadata?.title || `YouTube Video ${videoId}`;
          finalContent = [
            `# ${finalTitle}`,
            "",
            `**Source:** ${url}`,
            result.summary ? `**Extracted:** ${result.summary}` : "",
            "",
            "---",
            "",
            result.content,
          ].join("\n");
          finalSummary = result.summary;
          success = true;
        } else {
          throw new Error("Gemini returned null result");
        }
      } catch (error) {
        // Fallback: create manual doc
        errorMessage = error instanceof Error ? error.message : "Unknown error during extraction";
        finalTitle = userTitle || metadata?.title || `YouTube Video ${videoId}`;
        finalContent = buildManualDoc(url, videoId, metadata, errorMessage);
        finalSummary = "Manual viewing required - extraction failed";
        success = false;
      }
    } else {
      finalTitle = userTitle || metadata?.title || `YouTube Video ${videoId}`;
      finalContent = buildMetadataDoc(url, videoId, metadata);
      finalSummary = "Transcript unavailable - metadata only";
      success = false;
      errorMessage = "Transcript unavailable";
    }

    // Save to database
    const doc = await db.doc.create({
      data: {
        title: finalTitle,
        content: finalContent,
        source: url,
        category: "youtube",
        summary: finalSummary,
        tags: serializeTags(
          buildDocTags({
            title: finalTitle,
            content: finalContent,
            source: url,
            category: "youtube",
            requiredTags: ["youtube"],
          })
        ),
      },
    });

    return ok(
      {
        doc,
        success,
        method: success ? "gemini-transcript-analysis" : transcript ? "manual-fallback" : "metadata-fallback",
        message: success
          ? "Successfully extracted video content using Gemini"
          : "Created placeholder document. " + errorMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Failed to process YouTube video",
      "INTERNAL_ERROR",
      500
    );
  }
}
