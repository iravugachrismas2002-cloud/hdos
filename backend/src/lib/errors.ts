// Copyright (c) 2026 HDOS Rwanda. All rights reserved.

export interface ErrorDetail {
  field: string;
  message: string;
}

/** An error whose message is safe to show to API clients. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, code = "BAD_REQUEST", details?: ErrorDetail[]) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHENTICATED") {
    return new AppError(401, code, message);
  }
  static forbidden(message = "You do not have permission to do this", code = "FORBIDDEN") {
    return new AppError(403, code, message);
  }
  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new AppError(409, code, message);
  }
  static unavailable(message: string, code = "SERVICE_UNAVAILABLE") {
    return new AppError(503, code, message);
  }
}
