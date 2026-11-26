import { describe, expect, it } from "vitest";
import { isProduction, loadConfig } from "../src/index.js";

describe("loadConfig", () => {
  it("memakai default yang aman untuk development", () => {
    const config = loadConfig({});
    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(3000);
    expect(isProduction(config)).toBe(false);
  });

  it("mengubah PORT dari string", () => {
    expect(loadConfig({ PORT: "8080" }).PORT).toBe(8080);
  });

  it("menolak konfigurasi invalid", () => {
    expect(() => loadConfig({ PORT: "99999" })).toThrow();
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow();
  });

  it("menolak secret webhook yang terlalu pendek", () => {
    expect(() => loadConfig({ WEBHOOK_SIGNING_SECRET: "pendek" })).toThrow();
  });
});
