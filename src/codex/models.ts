// src/codex/models.ts
export const MODEL_MAPPING: Record<string, string> = {
  "claude-sonnet-4-20250514": "gpt-5.2-codex",
  "claude-3-5-sonnet-20241022": "gpt-5.2-codex",
  "claude-3-haiku-20240307": "gpt-5.3-codex-spark",
  "claude-3-opus-20240229": "gpt-5.3-codex-xhigh",
};

export const DEFAULT_CODEX_MODEL = "gpt-5.2-codex";

export function mapAnthropicModelToCodex(anthropicModel: string): string {
  return MODEL_MAPPING[anthropicModel] ?? DEFAULT_CODEX_MODEL;
}

export const CODEX_MODEL_EFFORT: Record<string, string> = {
  "gpt-5.3-codex": "high",
  "gpt-5.3-codex-spark": "low",
  "gpt-5.3-codex-medium": "medium",
  "gpt-5.3-codex-low": "low",
  "gpt-5.3-codex-xhigh": "xhigh",
  "gpt-5.2-codex": "high",
  "gpt-5.2-codex-medium": "medium",
  "gpt-5.2-codex-low": "low",
  "gpt-5.2-codex-xhigh": "xhigh",
  "gpt-5.1-codex": "high",
  "gpt-5.1-codex-max": "xhigh",
  "gpt-5.1-codex-mini": "medium",
};

export function getEffortForModel(codexModel: string): string {
  return CODEX_MODEL_EFFORT[codexModel] ?? "medium";
}
