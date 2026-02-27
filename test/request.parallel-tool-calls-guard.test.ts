import test from "node:test";
import assert from "node:assert/strict";

import { transformAnthropicToCodex } from "../src/transformers/request.js";
import type { AnthropicRequest } from "../src/types/anthropic.js";

function buildRequest(overrides: Partial<AnthropicRequest> = {}): AnthropicRequest {
  return {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: "test" }],
    parallel_tool_calls: true,
    ...overrides,
  };
}

test("keeps parallel_tool_calls for non-mutating tools", () => {
  const request = buildRequest({
    tools: [
      {
        name: "Read",
        description: "Read file",
        input_schema: { type: "object", properties: { filePath: { type: "string" } } },
      },
      {
        name: "Grep",
        description: "Search content",
        input_schema: { type: "object", properties: { pattern: { type: "string" } } },
      },
    ],
  });

  const codex = transformAnthropicToCodex(request);
  assert.equal(codex.parallel_tool_calls, true);
});

test("omits parallel_tool_calls when mutating tool is present", () => {
  const request = buildRequest({
    tools: [
      {
        name: "Read",
        description: "Read file",
        input_schema: { type: "object", properties: { filePath: { type: "string" } } },
      },
      {
        name: "Update",
        description: "Update file",
        input_schema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            oldString: { type: "string" },
            newString: { type: "string" },
          },
        },
      },
    ],
  });

  const codex = transformAnthropicToCodex(request);
  assert.equal(codex.parallel_tool_calls, undefined);
});

test("omits parallel_tool_calls when mutating tool is chosen directly", () => {
  const request = buildRequest({
    tools: [
      {
        name: "Update",
        description: "Update file",
        input_schema: {
          type: "object",
          properties: {
            filePath: { type: "string" },
            oldString: { type: "string" },
            newString: { type: "string" },
          },
        },
      },
    ],
    tool_choice: { type: "tool", name: "Update" },
  });

  const codex = transformAnthropicToCodex(request);
  assert.equal(codex.parallel_tool_calls, undefined);
});
