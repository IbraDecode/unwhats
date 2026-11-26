/**
 * UnWhats Error Registry.
 *
 * Setiap error yang keluar dari API wajib menggunakan kode dari registry ini.
 * Tidak ada provider yang boleh mengirimkan kode error mentah ke konsumen API.
 */

export const ERROR_CODES = [
  "AUTHENTICATION_ERROR",
  "AUTHORIZATION_ERROR",
  "TENANT_ISOLATION_VIOLATION",
  "VALIDATION_ERROR",
  "CONFIGURATION_ERROR",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_TIMEOUT",
  "RATE_LIMITED",
  "UNSUPPORTED_CAPABILITY",
  "INVALID_MESSAGE",
  "MEDIA_PROCESSING_FAILED",
  "DELIVERY_FAILED",
  "WEBHOOK_FAILED",
  "RESOURCE_NOT_FOUND",
  "IDEMPOTENCY_CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type UnWhatsErrorCode = (typeof ERROR_CODES)[number];

const HTTP_STATUS: Readonly<Record<UnWhatsErrorCode, number>> = {
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  TENANT_ISOLATION_VIOLATION: 403,
  VALIDATION_ERROR: 400,
  CONFIGURATION_ERROR: 500,
  PROVIDER_UNAVAILABLE: 503,
  PROVIDER_TIMEOUT: 504,
  RATE_LIMITED: 429,
  UNSUPPORTED_CAPABILITY: 422,
  INVALID_MESSAGE: 400,
  MEDIA_PROCESSING_FAILED: 422,
  DELIVERY_FAILED: 502,
  WEBHOOK_FAILED: 500,
  RESOURCE_NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

const RETRYABLE: ReadonlySet<UnWhatsErrorCode> = new Set<UnWhatsErrorCode>([
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_TIMEOUT",
  "RATE_LIMITED",
  "DELIVERY_FAILED",
  "WEBHOOK_FAILED",
]);

const DEFAULT_MESSAGES: Readonly<Record<UnWhatsErrorCode, string>> = {
  AUTHENTICATION_ERROR: "Authentication credentials are missing or invalid.",
  AUTHORIZATION_ERROR: "The authenticated identity is not allowed to perform this action.",
  TENANT_ISOLATION_VIOLATION: "The requested resource belongs to another organization.",
  VALIDATION_ERROR: "The request payload is invalid.",
  CONFIGURATION_ERROR: "The service is misconfigured.",
  PROVIDER_UNAVAILABLE: "The provider is temporarily unavailable.",
  PROVIDER_TIMEOUT: "The provider did not respond in time.",
  RATE_LIMITED: "Too many requests. Please retry later.",
  UNSUPPORTED_CAPABILITY: "The provider does not support this capability.",
  INVALID_MESSAGE: "The message payload is not valid for this provider.",
  MEDIA_PROCESSING_FAILED: "The media could not be processed.",
  DELIVERY_FAILED: "The provider could not deliver the message.",
  WEBHOOK_FAILED: "The webhook could not be delivered.",
  RESOURCE_NOT_FOUND: "The requested resource does not exist.",
  IDEMPOTENCY_CONFLICT: "An idempotency key was reused with a different payload.",
  INTERNAL_ERROR: "An unexpected internal error occurred.",
};

const DOCS_BASE_URL = "https://docs.unwhats.dev/errors";

export interface UnWhatsErrorOptions {
  code: UnWhatsErrorCode;
  message?: string;
  requestId?: string;
  httpStatus?: number;
  retryable?: boolean;
  providerCode?: string;
  documentationUrl?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export interface ErrorPayload {
  error: {
    code: UnWhatsErrorCode;
    message: string;
    request_id?: string;
    retryable: boolean;
    provider_code?: string;
    documentation_url: string;
    details?: Record<string, unknown>;
  };
}

export class UnWhatsError extends Error {
  readonly code: UnWhatsErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly providerCode?: string;
  readonly documentationUrl: string;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(options: UnWhatsErrorOptions) {
    super(options.message ?? DEFAULT_MESSAGES[options.code]);
    this.name = "UnWhatsError";
    this.code = options.code;
    this.httpStatus = options.httpStatus ?? HTTP_STATUS[options.code];
    this.retryable = options.retryable ?? RETRYABLE.has(options.code);
    this.requestId = options.requestId;
    this.providerCode = options.providerCode;
    this.documentationUrl = options.documentationUrl ?? `${DOCS_BASE_URL}#${options.code.toLowerCase()}`;
    this.details = options.details;
    this.cause = options.cause;
    Error.captureStackTrace?.(this, UnWhatsError);
  }

  toPayload(): ErrorPayload {
    const payload: ErrorPayload["error"] = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      documentation_url: this.documentationUrl,
    };
    if (this.requestId !== undefined) payload.request_id = this.requestId;
    if (this.providerCode !== undefined) payload.provider_code = this.providerCode;
    if (this.details !== undefined) payload.details = this.details;
    return { error: payload };
  }

  toJSON(): ErrorPayload {
    return this.toPayload();
  }
}

export function isUnWhatsError(value: unknown): value is UnWhatsError {
  return value instanceof UnWhatsError;
}

interface HasIssues {
  issues: unknown[];
}

function isValidationLike(value: object): value is HasIssues {
  return Array.isArray((value as HasIssues).issues);
}

function extractMessage(value: unknown): string | undefined {
  if (value instanceof Error && value.message.length > 0) return value.message;
  return undefined;
}

/**
 * Mengubah error apa pun menjadi UnWhatsError.
 * Error provider mentah tidak pernah diteruskan langsung ke API response.
 */
export function toUnWhatsError(error: unknown, requestId?: string): UnWhatsError {
  if (isUnWhatsError(error)) {
    return requestId !== undefined && error.requestId === undefined
      ? new UnWhatsError({
          code: error.code,
          message: error.message,
          requestId,
          httpStatus: error.httpStatus,
          retryable: error.retryable,
          providerCode: error.providerCode,
          documentationUrl: error.documentationUrl,
          details: error.details,
          cause: error.cause,
        })
      : error;
  }

  if (typeof error === "object" && error !== null) {
    if (isValidationLike(error)) {
      return new UnWhatsError({
        code: "VALIDATION_ERROR",
        requestId,
        details: { issues: error.issues },
        cause: error,
      });
    }
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && (ERROR_CODES as readonly string[]).includes(maybeCode)) {
      return new UnWhatsError({
        code: maybeCode as UnWhatsErrorCode,
        message: extractMessage(error),
        requestId,
        cause: error,
      });
    }
  }

  return new UnWhatsError({
    code: "INTERNAL_ERROR",
    message: extractMessage(error),
    requestId,
    cause: error,
  });
}

export function httpStatusFor(code: UnWhatsErrorCode): number {
  return HTTP_STATUS[code];
}

export function isRetryable(code: UnWhatsErrorCode): boolean {
  return RETRYABLE.has(code);
}
