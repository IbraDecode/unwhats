import { UnWhatsError, type UnWhatsErrorCode } from "@unwhats/errors";

interface MetaErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface Mapping {
  code: UnWhatsErrorCode;
  retryable?: boolean;
}

function mappingFor(status: number, code: number | undefined): Mapping {
  if (status === 401 || code === 190 || code === 463) {
    return { code: "AUTHENTICATION_ERROR" };
  }
  if (status === 403 || code === 100 || code === 131 || code === 132) {
    return { code: "AUTHORIZATION_ERROR" };
  }
  if (status === 429 || code === 80001 || code === 4) {
    return { code: "RATE_LIMITED", retryable: true };
  }
  if (status === 400 || code === 131009 || code === 131026 || code === 132001 || code === 133010) {
    return { code: "INVALID_MESSAGE" };
  }
  if (status >= 500) {
    return { code: "PROVIDER_UNAVAILABLE", retryable: true };
  }
  return { code: "DELIVERY_FAILED", retryable: true };
}

/**
 * Error Meta tidak pernah diteruskan mentah ke konsumen API UnWhats.
 * Detail teknis disimpan pada `provider_code` dan `details`.
 */
export function mapMetaError(status: number, body: unknown): UnWhatsError {
  const metaError = (body as MetaErrorBody | undefined)?.error;
  const code = metaError?.code;
  const mapping = mappingFor(status, code);

  return new UnWhatsError({
    code: mapping.code,
    retryable: mapping.retryable,
    providerCode: code !== undefined ? String(code) : String(status),
    details: {
      meta_type: metaError?.type ?? "unknown",
      meta_subcode: metaError?.error_subcode ?? null,
      http_status: status,
    },
    cause: body,
  });
}

export function mapNetworkError(error: unknown): UnWhatsError {
  if (error instanceof UnWhatsError) return error;
  const isTimeout =
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      error.message.includes("timeout"));

  return new UnWhatsError({
    code: isTimeout ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
    retryable: true,
    cause: error,
  });
}
