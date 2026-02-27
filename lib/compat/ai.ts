import OpenAI from "openai";
import { createReadStream } from "node:fs";
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import type { OpenAIModelRef } from "@/lib/compat/ai-sdk-openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type GenerateObjectInput<TSchema extends ZodTypeAny> = {
  model: OpenAIModelRef;
  prompt: string;
  schema: TSchema;
};

function parseResponseContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const textPart = content.find((item) => item && typeof item === "object" && "type" in item && (item as { type?: string }).type === "text");
  if (!textPart || typeof textPart !== "object" || !("text" in textPart)) return "";
  const text = (textPart as { text?: unknown }).text;
  return typeof text === "string" ? text : "";
}

export async function generateObject<TSchema extends ZodTypeAny>({
  model,
  prompt,
  schema,
}: GenerateObjectInput<TSchema>): Promise<{ object: ZodInfer<TSchema> }> {
  const response = await client.chat.completions.create({
    model: model.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return only JSON. Follow the requested schema exactly. Do not include markdown fences.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = parseResponseContent(response.choices[0]?.message?.content ?? "");
  const parsed = schema.parse(JSON.parse(raw));
  return { object: parsed };
}

type TranscribeAudioInput = {
  filePath: string;
  language?: string;
  prompt?: string;
};

export async function transcribeAudioWithWhisper({
  filePath,
  language,
  prompt,
}: TranscribeAudioInput): Promise<string> {
  const response = await client.audio.transcriptions.create({
    model: "whisper-1",
    file: createReadStream(filePath),
    ...(language ? { language } : {}),
    ...(prompt ? { prompt } : {}),
  });

  return response.text.trim();
}
