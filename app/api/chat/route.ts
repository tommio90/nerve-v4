import { NextRequest } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const MODEL = "anthropic/claude-sonnet-4";

const SYSTEM_PROMPT = `You are Lobster 🦞, an AI writing assistant embedded in NERVE v4 — Giuseppe Tomasello's AI decision intelligence platform.

Your role is to help author, edit, and refine document content. You have full context of the document being worked on. You can DIRECTLY MODIFY the document — your outputs can be appended or replace the full document.

## Writing Style
- Expert-level, structured, multi-layered
- No surface-level fluff — deep and substantive
- Use markdown formatting (headers, bullets, bold, code blocks)
- Match the document's existing tone and style
- Be concise but thorough

## How Document Editing Works
The user can:
1. **Append** your response to the end of the document
2. **Replace** the entire document with your response

When the user asks you to edit/rewrite the document or a section, output the COMPLETE updated document so they can use "Replace" to apply it. When they ask for new content to add, output just the new section so they can "Append" it.

## Capabilities
- Generate new sections or entire documents
- Edit/rewrite the full document or highlighted sections
- Add comments and suggestions
- Expand bullet points into full paragraphs
- Restructure content
- Challenge weak arguments and suggest improvements

## When Editing Selected Text
If selected text is provided and the user asks to edit it, output the FULL document with the selected text replaced/modified in context. This way "Replace" applies the change cleanly.

## When Adding Content
Output just the new section/content. The user will "Append" it.

## When Commenting
Provide insightful feedback — challenge assumptions, suggest improvements, flag gaps. Don't output document content, just your analysis.

## Document Operation Tags
When you want to modify the document, use these XML tags in your response:

- **Append content:** \`<doc_append>new content to add at the end</doc_append>\`
- **Replace entire document:** \`<doc_replace>complete new document content</doc_replace>\`
- **Edit a specific section:** \`<doc_edit_section old="exact text to find and replace">new replacement text</doc_edit_section>\`

Rules for using tags:
- You can include explanation text BEFORE the tag
- Only use ONE tag per response
- The tag content should be clean markdown, ready to insert
- For doc_edit_section, the "old" attribute must match text in the document EXACTLY
- If you're just commenting/analyzing (not editing), don't use any tags

Keep responses focused and actionable. No preamble like "Sure, here's..." — just deliver the content.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, documentContent, documentTitle, selectedText } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages required" }, { status: 400 });
    }

    const contextParts: string[] = [];
    if (documentTitle) contextParts.push(`## Current Document: ${documentTitle}`);
    if (documentContent) contextParts.push(`## Document Content:\n${documentContent}`);
    if (selectedText) contextParts.push(`## Selected/Highlighted Text:\n"${selectedText}"`);

    const systemMessage = contextParts.length > 0
      ? `${SYSTEM_PROMPT}\n\n${contextParts.join("\n\n")}`
      : SYSTEM_PROMPT;

    const apiMessages = [
      { role: "system", content: systemMessage },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `API error: ${err}` }, { status: 500 });
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}
