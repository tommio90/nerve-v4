import OpenAI from "openai";
import { PODCAST_SCRIPT_PROMPT } from "@/lib/ai/prompts";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function generatePodcastScript(markdown: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    messages: [
      { role: "system", content: PODCAST_SCRIPT_PROMPT },
      {
        role: "user",
        content: `Create a script from this markdown document:\n\n${markdown.slice(0, 12000)}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function synthesizePodcast(script: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY");
  }

  // This uses a single voice for Phase 1 while preserving a 2-host script format.
  const response = await fetch(`${ELEVENLABS_URL}/EXAVITQu4vr4xnSDxMaL`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: script,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}
