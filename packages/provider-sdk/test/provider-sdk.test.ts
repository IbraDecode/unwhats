import { describe, expect, it } from "vitest";
import { InMemoryProvider, ProviderRegistry } from "../src/index.js";
import { UnWhatsError } from "@unwhats/errors";

const context = {
  organization_id: "org_01JXYZ123ABCDEF",
  project_id: "prj_01JXYZ123ABCDEF",
  config: {},
};

const textInput = {
  provider: "in-memory",
  to: "+6281234567890",
  type: "text" as const,
  text: { body: "Halo" },
};

describe("BaseProvider", () => {
  it("mengubah lifecycle REGISTERED -> READY -> STOPPED", async () => {
    const provider = new InMemoryProvider();
    expect(provider.getLifecycle()).toBe("registered");
    await provider.initialize(context);
    expect(provider.getLifecycle()).toBe("ready");
    await provider.shutdown();
    expect(provider.getLifecycle()).toBe("stopped");
  });

  it("menolak pengiriman sebelum inisialisasi", async () => {
    const provider = new InMemoryProvider();
    await expect(provider.sendMessage(textInput)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
  });

  it("menolak capability yang tidak dideklarasikan", async () => {
    const provider = new InMemoryProvider({ capabilities: { text: true } });
    await provider.initialize(context);
    await expect(
      provider.sendMessage({
        provider: "in-memory",
        to: "+6281234567890",
        type: "image",
        media: { url: "https://example.com/a.png" },
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CAPABILITY" });
  });

  it("mengirim pesan dan menyimpannya", async () => {
    const provider = new InMemoryProvider();
    await provider.initialize(context);
    const result = await provider.sendMessage(textInput);
    expect(result.message.status).toBe("accepted");
    expect(result.provider_message_id).toMatch(/^acc_/);
    expect(await provider.getMessage(result.message.id)).not.toBeNull();
  });

  it("menghasilkan descriptor lengkap", async () => {
    const provider = new InMemoryProvider();
    await provider.initialize(context);
    const descriptor = await provider.getDescriptor();
    expect(descriptor.capabilities.text).toBe(true);
    expect(descriptor.lifecycle).toBe("ready");
    expect(descriptor.production_ready).toBe(false);
  });
});

describe("ProviderRegistry", () => {
  it("menolak duplikat provider", async () => {
    const registry = new ProviderRegistry();
    registry.register(new InMemoryProvider());
    expect(() => registry.register(new InMemoryProvider())).toThrow(UnWhatsError);
    expect(registry.require("in-memory").id).toBe("in-memory");
  });

  it("menginisialisasi semua provider", async () => {
    const registry = new ProviderRegistry();
    registry.register(new InMemoryProvider({ id: "a" }));
    registry.register(new InMemoryProvider({ id: "b" }));
    await registry.initializeAll(context);
    const descriptors = await registry.descriptors();
    expect(descriptors).toHaveLength(2);
    expect(descriptors.every((item) => item.lifecycle === "ready")).toBe(true);
    await registry.shutdownAll();
  });
});
