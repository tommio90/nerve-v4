export type OpenAIModelRef = {
  provider: "openai";
  model: string;
};

export function openai(model: string): OpenAIModelRef {
  return { provider: "openai", model };
}
