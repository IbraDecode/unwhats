import { describe, expect, it } from "vitest";
import { createLogger, redact } from "../src/index.js";

describe("redact", () => {
  it("menyembunyikan kunci sensitif secara rekursif", () => {
    const result = redact({
      api_key: "uw_live_secret",
      nested: { password: "rahasia", safe: "aman" },
    });
    expect(result).toEqual({
      api_key: "[REDACTED]",
      nested: { password: "[REDACTED]", safe: "aman" },
    });
  });
});

describe("createLogger", () => {
  it("menulis JSON dengan level dan binding", () => {
    const lines: string[] = [];
    const logger = createLogger({
      name: "unwhats-api",
      level: "info",
      sink: (line) => lines.push(line),
      bindings: { request_id: "req_123" },
    });
    logger.info("provider ready", { provider_id: "in-memory" });
    const parsed = JSON.parse(lines[0] ?? "{}");
    expect(parsed.level).toBe("info");
    expect(parsed.request_id).toBe("req_123");
    expect(parsed.provider_id).toBe("in-memory");
  });

  it("menyaring level di bawah threshold", () => {
    const lines: string[] = [];
    const logger = createLogger({ name: "test", level: "warn", sink: (line) => lines.push(line) });
    logger.debug("tidak tampil");
    logger.info("tidak tampil");
    logger.warn("tampil");
    expect(lines).toHaveLength(1);
  });

  it("child logger mewarisi binding", () => {
    const lines: string[] = [];
    const parent = createLogger({
      name: "test",
      sink: (line) => lines.push(line),
      bindings: { organization_id: "org_01JXYZ" },
    });
    parent.child({ request_id: "req_01JXYZ" }).error("gagal");
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      organization_id: "org_01JXYZ",
      request_id: "req_01JXYZ",
    });
  });
});
