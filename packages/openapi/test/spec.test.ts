import { describe, expect, it } from "vitest";
import { getSpecAsJson, openapiSpec } from "../src/index.js";

describe("OpenAPI 3.1 spec", () => {
  it("memiliki metadata dan server yang benar", () => {
    expect(openapiSpec.openapi).toBe("3.1.0");
    expect(openapiSpec.info.title).toBe("UnWhats API");
    expect(openapiSpec.servers.some((server) => server.url.includes("unwhats.dev"))).toBe(true);
  });

  it("mendefinisikan endpoint inti", () => {
    expect(Object.keys(openapiSpec.paths)).toEqual(
      expect.arrayContaining([
        "/health",
        "/ready",
        "/v1/messages",
        "/v1/messages/{id}",
        "/v1/providers",
        "/v1/webhooks",
        "/v1/usage",
      ]),
    );
  });

  it("menghasilkan JSON yang valid", () => {
    const parsed: unknown = JSON.parse(getSpecAsJson());
    expect((parsed as { openapi: string }).openapi).toBe("3.1.0");
  });
});
