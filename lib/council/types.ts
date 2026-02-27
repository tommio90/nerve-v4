export type ScoreDimension =
  | "strategic_alignment"
  | "execution_readiness"
  | "leverage_potential"
  | "novelty_factor"
  | "resource_efficiency"
  | "timing_relevance";

export type ModelAnalysis = {
  scores: Record<ScoreDimension, number>;
  reasoning: string;
  confidence: number;
  stance: "approve" | "reject" | "revise";
  keyArgument: string;
  challenges: string[];
};

export type CouncilSession = {
  id: string;
  taskTitle: string;
  taskDescription: string;
  venture: string | null;
  entityType: string | null;
  entityId: string | null;
  proposalDocId: string | null;
  status: "pending" | "debating" | "decided" | "failed";
  opusAnalysis: ModelAnalysis | null;
  o3Analysis: ModelAnalysis | null;
  geminiAnalysis: ModelAnalysis | null;
  qwenAnalysis: ModelAnalysis | null;
  aggregateScore: number | null;
  recommendation: "approve" | "reject" | "revise" | null;
  confidence: "high" | "medium" | "low" | null;
  summary: string | null;
  actionId: string | null;
  createdAt: string;
  updatedAt: string;
};
