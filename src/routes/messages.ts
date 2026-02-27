import { Router, type Request, type Response, type NextFunction } from "express";
import { CodexApiError, CodexClient } from "../codex/client.js";
import { transformAnthropicToCodex } from "../transformers/request.js";
import { transformCodexToAnthropic } from "../transformers/response.js";
import type { AnthropicRequest, AnthropicResponse } from "../types/anthropic.js";
import { ProxyError } from "../utils/errors.js";

const router = Router();
const codexClient = new CodexClient();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "chatgpt-codex-proxy",
    timestamp: new Date().toISOString(),
    proxy_signature: process.env.CHATGPT_CODEX_PROXY_SIGNATURE ?? null,
    model_overrides: {
      haiku: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? null,
      sonnet: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? null,
      opus: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? null,
    },
  });
});

router.post(
  "/v1/messages",
  async (req: Request<unknown, AnthropicResponse, AnthropicRequest>, res: Response, next: NextFunction) => {
    const body = req.body;

    try {
      // Validate request
      if (!body || typeof body !== "object") {
        throw new ProxyError("Invalid JSON body", 400, "invalid_request_error");
      }

      if (!body.model || !Array.isArray(body.messages)) {
        throw new ProxyError(
          "Missing required fields: model, messages",
          400,
          "invalid_request_error"
        );
      }

      console.log(
        `[chatgpt-codex-proxy] inbound messages model=${body.model} stream=${Boolean(body.stream)} messages=${body.messages.length}`,
      );

      // Transform and call Codex
      const codexRequest = transformAnthropicToCodex(body);
      const codexResponse = await codexClient.createResponse(codexRequest);
      const anthropicResponse = transformCodexToAnthropic(codexResponse, body.model);

      // Handle streaming
      if (body.stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // message_start
        res.write(
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: anthropicResponse.id,
              type: "message",
              role: "assistant",
              model: anthropicResponse.model,
              content: [],
              stop_reason: null,
              usage: { input_tokens: 0, output_tokens: 0 },
            },
          })}\n\n`
        );

        let blockIndex = 0;
        for (const block of anthropicResponse.content ?? []) {
          if (block.type === "text") {
            res.write(
              `event: content_block_start\ndata: ${JSON.stringify({
                type: "content_block_start",
                index: blockIndex,
                content_block: { type: "text", text: "" },
              })}\n\n`
            );

            res.write(
              `event: content_block_delta\ndata: ${JSON.stringify({
                type: "content_block_delta",
                index: blockIndex,
                delta: { type: "text_delta", text: block.text ?? "" },
              })}\n\n`
            );

            res.write(
              `event: content_block_stop\ndata: ${JSON.stringify({
                type: "content_block_stop",
                index: blockIndex,
              })}\n\n`
            );
            blockIndex += 1;
            continue;
          }

          if (block.type === "tool_use") {
            res.write(
              `event: content_block_start\ndata: ${JSON.stringify({
                type: "content_block_start",
                index: blockIndex,
                content_block: {
                  type: "tool_use",
                  id: block.id,
                  name: block.name,
                  input: {},
                },
              })}\n\n`
            );

            res.write(
              `event: content_block_delta\ndata: ${JSON.stringify({
                type: "content_block_delta",
                index: blockIndex,
                delta: {
                  type: "input_json_delta",
                  partial_json: JSON.stringify(block.input ?? {}),
                },
              })}\n\n`
            );

            res.write(
              `event: content_block_stop\ndata: ${JSON.stringify({
                type: "content_block_stop",
                index: blockIndex,
              })}\n\n`
            );
            blockIndex += 1;
          }
        }

        // message_delta
        res.write(
          `event: message_delta\ndata: ${JSON.stringify({
            type: "message_delta",
            delta: { stop_reason: anthropicResponse.stop_reason, stop_sequence: anthropicResponse.stop_sequence ?? null },
            usage: anthropicResponse.usage,
          })}\n\n`
        );

        // message_stop
        res.write(`event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`);
        res.end();
        return;
      }

      // Non-streaming response
      res.status(200).json(anthropicResponse);
    } catch (error) {
      if (error instanceof CodexApiError) {
        if (error.status === 401) {
          return next(new ProxyError(error.message, 401, "authentication_error"));
        }
        if (error.status === 429) {
          return next(new ProxyError(error.message, 429, "rate_limit_error"));
        }
        if (error.status === 400) {
          return next(new ProxyError(error.message, 400, "invalid_request_error"));
        }
        return next(new ProxyError(error.message, 502, "api_error"));
      }

      if (error instanceof Error) {
        return next(
          new ProxyError(
            `Unhandled proxy error: ${error.message}`,
            500,
            "internal_server_error",
            {
              name: error.name,
              stack: error.stack,
            },
          ),
        );
      }

      next(new ProxyError("Unhandled proxy error", 500, "internal_server_error", { error }));
    }
  }
);

export default router;
