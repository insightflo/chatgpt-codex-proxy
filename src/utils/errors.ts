import type { NextFunction, Request, Response } from "express";

export class ProxyError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    errorType = "proxy_error",
    details?: unknown
  ) {
    super(message);
    this.name = "ProxyError";
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
  }
}

interface AnthropicErrorBody {
  type: "error";
  error: {
    type: string;
    message: string;
  };
}

export function formatErrorResponse(error: ProxyError): AnthropicErrorBody {
  return {
    type: "error",
    error: {
      type: error.errorType,
      message: error.message
    }
  };
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new ProxyError("Not Found", 404, "not_found_error"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isBodyTooLarge =
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large";

  const isBodySyntaxError =
    err instanceof SyntaxError &&
    typeof err === "object" &&
    err !== null &&
    "body" in err;

  const proxyError = err instanceof ProxyError
    ? err
    : isBodyTooLarge
      ? new ProxyError(
          "Request body too large. Reduce image size or increase PROXY_JSON_LIMIT.",
          413,
          "request_too_large",
        )
      : isBodySyntaxError
        ? new ProxyError("Invalid JSON body", 400, "invalid_request_error")
        : new ProxyError("Internal Server Error", 500, "internal_server_error", {
            name: err instanceof Error ? err.name : undefined,
            message: err instanceof Error ? err.message : String(err),
          });

  if (proxyError.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error("[ERROR]", proxyError);
  }

  res.status(proxyError.statusCode).json(formatErrorResponse(proxyError));
}
