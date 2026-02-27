// src/transformers/response.ts
import type { AnthropicResponse, ContentBlock, ToolUseContentBlock } from "../types/anthropic.js";
import type { CodexResponse } from "../codex/client.js";

function parseJsonObject(input: string | undefined): unknown {
  if (!input) return {};
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

function extractContentFromCodexOutput(codexResponse: CodexResponse): { content: ContentBlock[]; hasToolUse: boolean } {
  const blocks: ContentBlock[] = [];

  for (const item of codexResponse.output ?? []) {
    if (item.type === "function_call") {
      const toolUse: ToolUseContentBlock = {
        type: "tool_use",
        id: typeof item.call_id === "string" && item.call_id.length > 0 ? item.call_id : item.id ?? "tool_call",
        name: typeof item.name === "string" ? item.name : "tool",
        input: parseJsonObject(typeof item.arguments === "string" ? item.arguments : undefined),
      };
      blocks.push(toolUse);
      continue;
    }

    for (const outputContent of item.content ?? []) {
      if (outputContent.type === "output_text" && typeof outputContent.text === "string" && outputContent.text.length > 0) {
        blocks.push({ type: "text", text: outputContent.text });
        continue;
      }

      if (outputContent.type === "tool_use") {
        const maybeName = typeof outputContent.name === "string" ? outputContent.name : "tool";
        const maybeId =
          typeof outputContent.id === "string" && outputContent.id.length > 0
            ? outputContent.id
            : typeof outputContent.call_id === "string" && outputContent.call_id.length > 0
              ? outputContent.call_id
              : "tool_call";
        blocks.push({
          type: "tool_use",
          id: maybeId,
          name: maybeName,
          input: parseJsonObject(typeof outputContent.arguments === "string" ? outputContent.arguments : undefined),
        });
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", text: "" });
  }

  const hasToolUse = blocks.some((block) => block.type === "tool_use");
  return { content: blocks, hasToolUse };
}

export function transformCodexToAnthropic(
  codexResponse: CodexResponse,
  originalModel: string,
): AnthropicResponse {
  const { content, hasToolUse } = extractContentFromCodexOutput(codexResponse);

  return {
    id: codexResponse.id,
    type: "message",
    role: "assistant",
    model: originalModel,
    content,
    stop_reason: hasToolUse ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: codexResponse.usage?.input_tokens ?? 0,
      output_tokens: codexResponse.usage?.output_tokens ?? 0,
    },
  };
}
