// src/codex/models.ts

const ENV_MODEL_MAPPING: Record<string, string | undefined> = {
  haiku: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  sonnet: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
  opus: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
};

const HARDCODED_MAPPING: Record<string, string> = {
  "claude-sonnet-4-20250514": "gpt-5.2-codex",
  "claude-3-5-sonnet-20241022": "gpt-5.2-codex",
  "claude-3-haiku-20240307": "gpt-5.3-codex-spark",
  "claude-3-opus-20240229": "gpt-5.3-codex-xhigh",
};

function getModelFamily(model: string): "haiku" | "sonnet" | "opus" | null {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return "haiku";
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  return null;
}

export const DEFAULT_CODEX_MODEL = "gpt-5.2-codex";

export function mapAnthropicModelToCodex(anthropicModel: string): string {
  const family = getModelFamily(anthropicModel);
  if (family) {
    const envModel = ENV_MODEL_MAPPING[family];
    if (envModel) return envModel;
  }
  return HARDCODED_MAPPING[anthropicModel] ?? DEFAULT_CODEX_MODEL;
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
