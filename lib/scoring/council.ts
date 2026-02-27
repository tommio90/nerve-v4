import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ModelAnalysis, ScoreDimension } from "@/lib/council/types";

// OpenRouter provider for multi-model council
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Direct OpenAI for aggregation (cheap)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const scoreDimensions = [
  "strategic_alignment",
  "execution_readiness",
  "leverage_potential",
  "novelty_factor",
  "resource_efficiency",
  "timing_relevance",
] as const;

export type CouncilResult = {
  opusAnalysis: ModelAnalysis;   // now Sonnet 4.5
  o3Analysis: ModelAnalysis;     // now DeepSeek R1
  geminiAnalysis: ModelAnalysis; // now Gemini 2.5 Pro
  qwenAnalysis?: ModelAnalysis;  // new: Qwen3 Coder
  aggregate_score: number;
  approval_prediction: number;
  recommendation: "approve" | "reject" | "revise";
  confidence: "high" | "medium" | "low";
  reasoning_summary: string;
};

const analysisSchema = z.object({
  scores: z.object({
    strategic_alignment: z.number().min(1).max(6),
    execution_readiness: z.number().min(1).max(6),
    leverage_potential: z.number().min(1).max(6),
    novelty_factor: z.number().min(1).max(6),
    resource_efficiency: z.number().min(1).max(6),
    timing_relevance: z.number().min(1).max(6),
  }),
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(100),
  stance: z.enum(["approve", "reject", "revise"]),
  keyArgument: z.string().min(1),
  challenges: z.array(z.string()).max(5),
});

const aggregateSchema = z.object({
  recommendation: z.enum(["approve", "reject", "revise"]),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning_summary: z.string().min(1),
});

type EvaluatorConfig = {
  name: string;
  weight: number;
  model: ReturnType<typeof openai>;
  perspective: string;
};

const dimensionWeights: Record<ScoreDimension, number> = {
  strategic_alignment: 0.25,
  execution_readiness: 0.2,
  leverage_potential: 0.2,
  novelty_factor: 0.12,
  resource_efficiency: 0.13,
  timing_relevance: 0.1,
};

const evaluators: Record<"sonnet" | "gemini" | "deepseek" | "qwen", EvaluatorConfig> = {
  sonnet: {
    name: "Claude Sonnet 4.5",
    weight: 0.30,
    model: openrouter("anthropic/claude-sonnet-4-5"),
    perspective:
      "Strategic evaluator: focus on long-term alignment, leverage, portfolio fit, and systemic risk. You are known for careful, nuanced analysis.",
  },
  gemini: {
    name: "Gemini 2.5 Pro",
    weight: 0.25,
    model: openrouter("google/gemini-2.5-pro"),
    perspective:
      "Creative evaluator: focus on novelty, insight generation, differentiated upside, and unconventional angles. You excel at connecting disparate ideas.",
  },
  deepseek: {
    name: "DeepSeek R1",
    weight: 0.25,
    model: openrouter("deepseek/deepseek-r1-0528"),
    perspective:
      "Reasoning evaluator: focus on logical consistency, execution feasibility, sequencing, and delivery quality. You reason step-by-step through complex trade-offs.",
  },
  qwen: {
    name: "Qwen3 Coder",
    weight: 0.20,
    model: openrouter("qwen/qwen3-coder"),
    perspective:
      "Technical evaluator: focus on technical architecture, resource efficiency, implementation complexity, and engineering leverage. You bring a builder's perspective.",
  },
};

function buildEvaluatorPrompt(input: {
  taskTitle: string;
  taskDescription: string;
  venture?: string | null;
  modelName: string;
  perspective: string;
}) {
  return `You are ${input.modelName} in NERVE's "Council of Models".

**Core Thesis:** AI optimizes within distributions. Humans expand distributions. The future belongs to those who cultivate curiosity.

**Evaluation Lens:**
- Does this amplify human curiosity or reduce humans to optimizers?
- Does it help humans explore (expand distributions) or just execute better (optimize within)?
- Is it a catalyst for human agency or a replacement for it?

${input.perspective}

Evaluate this proposal independently through the lens of the thesis above.
- Task Title: ${input.taskTitle}
- Venture: ${input.venture || "N/A"}
- Task Description: ${input.taskDescription}

Instructions:
- Score each dimension from 1 to 6 (integers or decimals allowed).
- Apply the thesis framework to your evaluation: prioritize exploration over optimization, curiosity over efficiency, human agency over automation.
- Keep reasoning concrete and specific to this task.
- Choose one stance: approve, reject, or revise.
- Provide one strongest argument and 1-5 key challenges.
- Set confidence as 0-100 for your own assessment quality.
`;
}

function weightedModelScore(analysis: ModelAnalysis) {
  return scoreDimensions.reduce((acc, dim) => acc + analysis.scores[dim] * dimensionWeights[dim], 0);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export async function runCouncilDebate(input: {
  taskTitle: string;
  taskDescription: string;
  venture?: string | null;
}): Promise<CouncilResult> {
  const [sonnetResult, geminiResult, deepseekResult, qwenResult] = await Promise.all([
    generateObject({
      model: evaluators.sonnet.model,
      schema: analysisSchema,
      prompt: buildEvaluatorPrompt({
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        venture: input.venture,
        modelName: evaluators.sonnet.name,
        perspective: evaluators.sonnet.perspective,
      }),
    }),
    generateObject({
      model: evaluators.gemini.model,
      schema: analysisSchema,
      prompt: buildEvaluatorPrompt({
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        venture: input.venture,
        modelName: evaluators.gemini.name,
        perspective: evaluators.gemini.perspective,
      }),
    }),
    generateObject({
      model: evaluators.deepseek.model,
      schema: analysisSchema,
      prompt: buildEvaluatorPrompt({
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        venture: input.venture,
        modelName: evaluators.deepseek.name,
        perspective: evaluators.deepseek.perspective,
      }),
    }),
    generateObject({
      model: evaluators.qwen.model,
      schema: analysisSchema,
      prompt: buildEvaluatorPrompt({
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        venture: input.venture,
        modelName: evaluators.qwen.name,
        perspective: evaluators.qwen.perspective,
      }),
    }),
  ]);

  const sonnetAnalysis = sonnetResult.object;
  const geminiAnalysis = geminiResult.object;
  const deepseekAnalysis = deepseekResult.object;
  const qwenAnalysis = qwenResult.object;

  const aggregateRaw =
    weightedModelScore(sonnetAnalysis) * evaluators.sonnet.weight +
    weightedModelScore(geminiAnalysis) * evaluators.gemini.weight +
    weightedModelScore(deepseekAnalysis) * evaluators.deepseek.weight +
    weightedModelScore(qwenAnalysis) * evaluators.qwen.weight;
  const aggregate_score = Math.round(aggregateRaw * 100) / 100;

  const confidenceWeighted =
    sonnetAnalysis.confidence * evaluators.sonnet.weight +
    geminiAnalysis.confidence * evaluators.gemini.weight +
    deepseekAnalysis.confidence * evaluators.deepseek.weight +
    qwenAnalysis.confidence * evaluators.qwen.weight;
  const approval_prediction = Math.round(clamp((aggregate_score / 6) * 100 * 0.65 + confidenceWeighted * 0.35, 0, 100));

  const allStances = [sonnetAnalysis.stance, geminiAnalysis.stance, deepseekAnalysis.stance, qwenAnalysis.stance];
  const stanceCounts = allStances.reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {} as Record<string, number>);
  const majorityStance = Object.entries(stanceCounts).sort((a, b) => b[1] - a[1])[0][0] as "approve" | "reject" | "revise";

  const aggregateSummaryPrompt = `You are aggregating a 4-model council debate with diverse AI perspectives.

Task:
- ${input.taskTitle}
- ${input.taskDescription}

Model outputs:
- Claude Sonnet 4.5 (strategic): score=${weightedModelScore(sonnetAnalysis).toFixed(2)} stance=${sonnetAnalysis.stance} confidence=${sonnetAnalysis.confidence}
  Key argument: ${sonnetAnalysis.keyArgument}
- Gemini 2.5 Pro (creative): score=${weightedModelScore(geminiAnalysis).toFixed(2)} stance=${geminiAnalysis.stance} confidence=${geminiAnalysis.confidence}
  Key argument: ${geminiAnalysis.keyArgument}
- DeepSeek R1 (reasoning): score=${weightedModelScore(deepseekAnalysis).toFixed(2)} stance=${deepseekAnalysis.stance} confidence=${deepseekAnalysis.confidence}
  Key argument: ${deepseekAnalysis.keyArgument}
- Qwen3 Coder (technical): score=${weightedModelScore(qwenAnalysis).toFixed(2)} stance=${qwenAnalysis.stance} confidence=${qwenAnalysis.confidence}
  Key argument: ${qwenAnalysis.keyArgument}

Aggregate score: ${aggregate_score.toFixed(2)}, Approval prediction: ${approval_prediction}%

Rules:
- If aggregate score >= 4.4 and approval_prediction >= 75 => likely approve.
- If aggregate score <= 2.8 or approval_prediction < 45 => likely reject.
- Else revise.
- Prefer council majority stance when close.
- Highlight where models disagreed — that's the most valuable signal.

Return concise recommendation, confidence, and summary that captures the multi-model debate dynamics.`;

  const aggregate = await generateObject({
    model: openrouter("anthropic/claude-sonnet-4-5"),
    schema: aggregateSchema,
    prompt: aggregateSummaryPrompt,
  });

  const recommendation =
    aggregate.object.recommendation === "revise" && aggregate_score >= 4.4 && approval_prediction >= 75
      ? "approve"
      : aggregate.object.recommendation === "revise" && aggregate_score <= 2.8
        ? "reject"
        : aggregate.object.recommendation;

  const resolvedRecommendation =
    recommendation === "revise" && Math.abs(aggregate_score - 3.6) < 0.4 ? majorityStance : recommendation;

  return {
    opusAnalysis: sonnetAnalysis,     // mapped to existing DB field
    o3Analysis: deepseekAnalysis,     // mapped to existing DB field
    geminiAnalysis: geminiAnalysis,   // mapped to existing DB field
    qwenAnalysis: qwenAnalysis,
    aggregate_score,
    approval_prediction,
    recommendation: resolvedRecommendation,
    confidence: aggregate.object.confidence,
    reasoning_summary: aggregate.object.reasoning_summary,
  };
}
