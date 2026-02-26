// src/transformers/response.ts
import type { AnthropicResponse } from "../types/anthropic.js";
import type { CodexResponse } from "../codex/client.js";

function extractTextFromCodexOutput(codexResponse: CodexResponse): string {
  const texts: string[] = [];

  for (const item of codexResponse.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.length > 0) {
        texts.push(content.text);
      }
    }
  }

  return texts.join("\n");
}

export function transformCodexToAnthropic(
  codexResponse: CodexResponse,
  originalModel: string,
): AnthropicResponse {
  const text = extractTextFromCodexOutput(codexResponse);

  return {
    id: codexResponse.id,
    type: "message",
    role: "assistant",
    model: originalModel,
    content: [
      {
        type: "text",
        text,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: codexResponse.usage?.input_tokens ?? 0,
      output_tokens: codexResponse.usage?.output_tokens ?? 0,
    },
  };
}
