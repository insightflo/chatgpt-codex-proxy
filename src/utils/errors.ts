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
  const proxyError =
    err instanceof ProxyError
      ? err
      : new ProxyError("Internal Server Error", 500, "internal_server_error");

  if (proxyError.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error("[ERROR]", proxyError);
  }

  res.status(proxyError.statusCode).json(formatErrorResponse(proxyError));
}
