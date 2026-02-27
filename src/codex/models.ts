// src/codex/models.ts

function getEnvModelForFamily(family: "haiku" | "sonnet" | "opus"): string | undefined {
  const value =
    family === "haiku"
      ? process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      : family === "sonnet"
        ? process.env.ANTHROPIC_DEFAULT_SONNET_MODEL
        : process.env.ANTHROPIC_DEFAULT_OPUS_MODEL;

  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const HARDCODED_MAPPING: Record<string, string> = {
  "claude-sonnet-4-20250514": "gpt-5.2-codex",
  "claude-3-5-sonnet-20241022": "gpt-5.2-codex",
  "claude-3-haiku-20240307": "gpt-5.3-codex-spark",
  "claude-3-opus-20240229": "gpt-5.3-codex-xhigh",
};

const SUPPORTED_CODEX_MODELS = new Set<string>([
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.3-codex-medium",
  "gpt-5.3-codex-low",
  "gpt-5.3-codex-xhigh",
  "gpt-5.2-codex",
  "gpt-5.2-codex-medium",
  "gpt-5.2-codex-low",
  "gpt-5.2-codex-xhigh",
  "gpt-5.1-codex",
  "gpt-5.1-codex-max",
  "gpt-5.1-codex-mini",
]);

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
  const selectedModel = family ? getEnvModelForFamily(family) : undefined;
  const mappedModel = HARDCODED_MAPPING[anthropicModel] ?? DEFAULT_CODEX_MODEL;
  const finalModel = selectedModel ?? mappedModel;
  const validatedModel =
    selectedModel && !SUPPORTED_CODEX_MODELS.has(selectedModel) ? mappedModel : finalModel;

  console.log(
    `[chatgpt-codex-proxy] model_map anthropic=${anthropicModel} family=${family ?? "unknown"} selected=${
      selectedModel ?? "-"
    } mapped=${mappedModel} final=${validatedModel}`,
  );

  return validatedModel;
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
