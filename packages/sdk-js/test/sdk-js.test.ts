import { describe, expect, it, vi } from "vitest";
import { UnWhatsClient, UnWhatsError } from "../src/index.js";

function mockFetch(response: { status: number; body: unknown; headers?: Record<string, string> }) {
  return vi.fn(async () =>
    new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "content-type": "application/json", ...response.headers },
    }),
  ) as unknown as typeof fetch;
}

const client = (fetchImpl: typeof fetch) =>
  new UnWhatsClient({ baseUrl: "https://api.unwhats.dev/v1", apiKey: "uw_test_key", fetch: fetchImpl });

describe("UnWhatsClient", () => {
  it("mengirim authorization header dan mengembalikan data", async () => {
    const fetchImpl = mockFetch({ status: 200, body: { data: { status: "ok" }, meta: { request_id: "req_1" } } });
    const result = await client(fetchImpl).health();
    expect(result).toEqual({ status: "ok" });
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://api.unwhats.dev/v1/health");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer uw_test_key");
  });

  it("mengirim idempotency key saat mengirim pesan", async () => {
    const fetchImpl = mockFetch({
      status: 200,
      body: { data: { id: "msg_01JXYZ123ABCDEF" }, meta: { request_id: "req_1" } },
    });
    await client(fetchImpl).sendMessage(
      { provider: "meta-cloud", to: "+6281234567890", type: "text", text: { body: "Halo" } },
      "order-2026-0001",
    );
    const [, init] = vi.mocked(fetchImpl).mock.calls[0] as unknown as [URL, RequestInit];
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("order-2026-0001");
  });

  it("mengubah error API menjadi UnWhatsError", async () => {
    const fetchImpl = mockFetch({
      status: 422,
      body: {
        error: {
          code: "UNSUPPORTED_CAPABILITY",
          message: "Provider tidak mendukung groups",
          retryable: false,
          documentation_url: "https://docs.unwhats.dev/errors",
        },
      },
    });
    await expect(client(fetchImpl).listProviders()).rejects.toMatchObject({
      code: "UNSUPPORTED_CAPABILITY",
      message: "Provider tidak mendukung groups",
    });
  });

  it(" fallback ke INTERNAL_ERROR untuk kode unknown", async () => {
    const fetchImpl = mockFetch({
      status: 500,
      body: { error: { code: "WEIRD_CODE", message: "gagal", retryable: false } },
    });
    await expect(client(fetchImpl).getUsage()).rejects.toBeInstanceOf(UnWhatsError);
  });

  it("menyusun query string", async () => {
    const fetchImpl = mockFetch({ status: 200, body: { data: [] } });
    await client(fetchImpl).listMessages({ limit: 5, starting_after: "msg_1" });
    const [url] = vi.mocked(fetchImpl).mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("limit=5");
    expect(String(url)).toContain("starting_after=msg_1");
  });
});
