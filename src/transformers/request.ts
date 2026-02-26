// src/transformers/request.ts
import { mapAnthropicModelToCodex, getEffortForModel } from "../codex/models.js";
import type { AnthropicRequest, ContentBlock } from "../types/anthropic.js";

export interface CodexMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CodexRequest {
  model: string;
  instructions: string;
  input: CodexMessage[];
  stream: boolean;
  store: boolean;
  reasoning: { effort: string; summary: string };
  text: { verbosity: string };
}

function flattenContent(content: string | ContentBlock[] | undefined): string {
  if (!content) return "";

  if (typeof content === "string") return content;

  return content
    .map((block) => {
      if (block.type === "text" && block.text) return block.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractSystemPrompt(system: string | ContentBlock[] | undefined): string {
  if (!system) return "";
  if (typeof system === "string") return system;

  return system
    .map((block) => {
      if (block.type === "text" && block.text) return block.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function transformAnthropicToCodex(anthropic: AnthropicRequest): CodexRequest {
  const codexModel = mapAnthropicModelToCodex(anthropic.model);
  const effort = getEffortForModel(codexModel);

  const systemInstruction = extractSystemPrompt(anthropic.system);

  const input: CodexMessage[] = (anthropic.messages ?? []).map((msg) => ({
    role: msg.role,
    content: flattenContent(msg.content),
  }));

  return {
    model: codexModel,
    instructions: systemInstruction,
    input,
    stream: Boolean(anthropic.stream),
    store: false,
    reasoning: { effort, summary: "auto" },
    text: { verbosity: "medium" },
  };
}
