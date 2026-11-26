import { describe, expect, it } from "vitest";
import { isMetaConfigured, isProduction, loadConfig } from "../src/index.js";

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

  it("mengaktifkan provider Meta hanya bila kredensial lengkap", () => {
    expect(isMetaConfigured(loadConfig({}))).toBe(false);
    expect(
      isMetaConfigured(
        loadConfig({
          META_ACCESS_TOKEN: "",
          META_PHONE_NUMBER_ID: "",
          META_APP_SECRET: "",
          META_WEBHOOK_VERIFY_TOKEN: "",
        }),
      ),
    ).toBe(false);
    const config = loadConfig({
      META_ACCESS_TOKEN: "token",
      META_PHONE_NUMBER_ID: "123",
      META_APP_SECRET: "app-secret-yang-panjang",
      META_WEBHOOK_VERIFY_TOKEN: "verify-token",
    });
    expect(isMetaConfigured(config)).toBe(true);
    expect(config.META_API_VERSION).toBe("v23.0");
  });
});
