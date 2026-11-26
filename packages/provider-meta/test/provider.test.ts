import { describe, expect, it, vi } from "vitest";
import { MetaCloudProvider, parseMetaConfig } from "../src/index.js";
import { UnWhatsError } from "@unwhats/errors";

const config = parseMetaConfig({
  access_token: "test-access-token",
  phone_number_id: "123456789",
  business_account_id: "987654321",
  api_version: "v23.0",
  app_secret: "a-very-long-app-secret-for-tests",
  webhook_verify_token: "verify-token-123",
});

const context = {
  organization_id: "org_01JXYZ000000000001",
  project_id: "prj_01JXYZ000000000002",
  config: {},
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("MetaCloudProvider", () => {
  it("mengirim pesan teks ke endpoint resmi", async () => {
    const fetchImpl = mockFetch(200, { messages: [{ id: "wamid.123" }] });
    const provider = new MetaCloudProvider({ config, fetchImpl });
    await provider.initialize(context);

    const result = await provider.sendMessage({
      provider: "meta-cloud",
      to: "+6281234567890",
      type: "text",
      text: { body: "Halo Meta" },
    });

    expect(result.provider_message_id).toBe("wamid.123");
    expect(result.message.status).toBe("accepted");
    expect(result.message.provider_id).toBe("meta-cloud");

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://graph.facebook.com/v23.0/123456789/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-access-token");
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload["messaging_product"]).toBe("whatsapp");
    expect(payload["type"]).toBe("text");
  });

  it("mengirim template dengan bahasa", async () => {
    const fetchImpl = mockFetch(200, { messages: [{ id: "wamid.tpl" }] });
    const provider = new MetaCloudProvider({ config, fetchImpl });
    await provider.initialize(context);

    await provider.sendMessage({
      provider: "meta-cloud",
      to: "+6281234567890",
      type: "template",
      template: { name: "order_update", language: "id", components: [] },
    });

    const [, init] = vi.mocked(fetchImpl).mock.calls[0] as unknown as [URL, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(payload["template"]).toMatchObject({ name: "order_update", language: { code: "id" } });
  });

  it("mendeklarasikan kapabilitas secara eksplisit", async () => {
    const provider = new MetaCloudProvider({ config, fetchImpl: mockFetch(200, {}) });
    await provider.initialize(context);
    const capabilities = await provider.getCapabilities();
    expect(capabilities.templates).toBe(true);
    expect(capabilities.delivery_receipts).toBe(true);
    expect(capabilities.groups).toBe(false);
    expect(capabilities.calling).toBe(false);
  });

  it("memetakan error Meta tanpa membocorkan pesan mentah", async () => {
    const fetchImpl = mockFetch(401, {
      error: { message: "(#190) Invalid OAuth access token", code: 190, type: "OAuthException" },
    });
    const provider = new MetaCloudProvider({ config, fetchImpl });
    await provider.initialize(context);

    await expect(
      provider.sendMessage({
        provider: "meta-cloud",
        to: "+6281234567890",
        type: "text",
        text: { body: "Halo" },
      }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_ERROR",
      providerCode: "190",
    });

    try {
      await provider.sendMessage({
        provider: "meta-cloud",
        to: "+6281234567890",
        type: "text",
        text: { body: "Halo" },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(UnWhatsError);
      expect((error as UnWhatsError).message).not.toContain("#190");
    }
  });

  it("health check mengukur latency", async () => {
    const provider = new MetaCloudProvider({ config, fetchImpl: mockFetch(200, { id: "123" }) });
    await provider.initialize(context);
    const health = await provider.healthCheck();
    expect(health.status).toBe("healthy");
    expect(health.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("mengambil daftar template", async () => {
    const fetchImpl = mockFetch(200, { data: [{ id: "tpl_1", name: "hello" }] });
    const provider = new MetaCloudProvider({ config, fetchImpl });
    await provider.initialize(context);
    expect(await provider.listTemplates()).toEqual([{ id: "tpl_1", name: "hello" }]);
  });
});
