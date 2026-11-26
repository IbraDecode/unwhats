import { describe, expect, it, vi } from "vitest";
import { ToolRegistry, UnWhatsMcpAdapter } from "../src/index.js";
import type { UnWhatsClient } from "@unwhats/sdk-js";

function fakeClient() {
  return {
    health: vi.fn(async () => ({ status: "ok" })),
    listProviders: vi.fn(async () => []),
    getProvider: vi.fn(async (id: string) => ({ id })),
    listMessages: vi.fn(async () => []),
    getMessage: vi.fn(async (id: string) => ({ id })),
    listWebhooks: vi.fn(async () => []),
    getUsage: vi.fn(async () => ({})),
    createWebhook: vi.fn(async () => ({})),
    sendMessage: vi.fn(async () => ({})),
  } as unknown as UnWhatsClient;
}

describe("ToolRegistry", () => {
  const registry = new ToolRegistry();

  it("memiliki tool dengan permission yang jelas", () => {
    expect(registry.get("send_message").permission).toBe("approval");
    expect(registry.get("get_health").permission).toBe("read");
    expect(registry.list().length).toBe(9);
  });

  it("menolak tool tanpa scope", () => {
    expect(() => registry.authorize("list_providers", [])).toThrow();
  });

  it("menolak send_message tanpa persetujuan", () => {
    expect(() => registry.authorize("send_message", ["messages:write"])).toThrow();
    expect(() =>
      registry.authorize("send_message", ["messages:write"], true),
    ).not.toThrow();
  });
});

describe("UnWhatsMcpAdapter", () => {
  it("memanggil API melalui client dengan audit", async () => {
    const client = fakeClient();
    const audit = vi.fn();
    const adapter = new UnWhatsMcpAdapter(client);
    const result = await adapter.callTool("get_health", {}, { scopes: ["providers:read"], audit });
    expect(result).toEqual({ status: "ok" });
    expect(audit).toHaveBeenCalledWith({
      tool: "get_health",
      scopes: ["providers:read"],
      approved: false,
    });
  });

  it("mengirim pesan hanya dengan approval", async () => {
    const client = fakeClient();
    const adapter = new UnWhatsMcpAdapter(client);
    const args = { provider: "meta-cloud", to: "+6281234567890", type: "text", text: { body: "Halo" } };
    await expect(
      adapter.callTool("send_message", args, { scopes: ["messages:write"] }),
    ).rejects.toThrow();
    await adapter.callTool("send_message", args, { scopes: ["messages:write"], approved: true });
    expect(client.sendMessage).toHaveBeenCalled();
  });
});
