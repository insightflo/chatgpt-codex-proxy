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
    timestamp: new Date().toISOString()
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

      // Transform and call Codex
      const codexRequest = transformAnthropicToCodex(body);
      const codexResponse = await codexClient.createResponse(codexRequest);
      const anthropicResponse = transformCodexToAnthropic(codexResponse, body.model);

      // Handle streaming
      if (body.stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const text = (anthropicResponse.content?.[0]?.type === "text" ? anthropicResponse.content[0].text : "") ?? "";

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

        // content_block_start
        res.write(
          `event: content_block_start\ndata: ${JSON.stringify({
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          })}\n\n`
        );

        // content_block_delta
        res.write(
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text },
          })}\n\n`
        );

        // content_block_stop
        res.write(
          `event: content_block_stop\ndata: ${JSON.stringify({
            type: "content_block_stop",
            index: 0,
          })}\n\n`
        );

        // message_delta
        res.write(
          `event: message_delta\ndata: ${JSON.stringify({
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
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
      next(error);
    }
  }
);

export default router;
