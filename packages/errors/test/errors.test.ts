import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  UnWhatsError,
  httpStatusFor,
  isRetryable,
  isUnWhatsError,
  toUnWhatsError,
} from "../src/index.js";

describe("error registry", () => {
  it("memiliki kode unik dan status yang sesuai", () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    expect(httpStatusFor("AUTHENTICATION_ERROR")).toBe(401);
    expect(httpStatusFor("RESOURCE_NOT_FOUND")).toBe(404);
    expect(httpStatusFor("PROVIDER_UNAVAILABLE")).toBe(503);
  });

  it("menandai error yang bisa dicoba ulang", () => {
    expect(isRetryable("PROVIDER_TIMEOUT")).toBe(true);
    expect(isRetryable("VALIDATION_ERROR")).toBe(false);
  });
});

describe("UnWhatsError", () => {
  it("menghasilkan payload API yang konsisten", () => {
    const error = new UnWhatsError({
      code: "UNSUPPORTED_CAPABILITY",
      requestId: "req_123",
      details: { capability: "groups" },
    });

    expect(error.toPayload()).toEqual({
      error: {
        code: "UNSUPPORTED_CAPABILITY",
        message: "The provider does not support this capability.",
        request_id: "req_123",
        retryable: false,
        documentation_url: expect.stringContaining("unsupported_capability"),
        details: { capability: "groups" },
      },
    });
  });

  it("mengisi requestId saat mengubah error internal", () => {
    const error = toUnWhatsError(new Error("boom"), "req_999");
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.requestId).toBe("req_999");
    expect(error.message).toBe("boom");
  });

  it("mendeteksi error berbentuk Zod issue", () => {
    const error = toUnWhatsError({ issues: [{ path: ["to"], message: "Required" }] });
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(isUnWhatsError(error)).toBe(true);
  });

  it("tidak membocorkan error provider mentah", () => {
    const raw = { name: "MetaApiError", error: { message: "(#131) permission denied" } };
    const error = toUnWhatsError(raw);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.toPayload().error.message).not.toContain("#131");
  });
});
