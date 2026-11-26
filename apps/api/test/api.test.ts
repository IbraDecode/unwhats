import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ApiKeyScope, ProviderCapabilities } from "@unwhats/contracts";
import { loadConfig } from "@unwhats/config";
import { InMemoryEventBus, InMemoryOutbox } from "@unwhats/event-bus";
import { InMemoryProvider, ProviderRegistry } from "@unwhats/provider-sdk";
import { ALL_SCOPES, InMemoryApiKeyStore } from "../src/auth.js";
import { buildApp, createStores } from "../src/app.js";
import { DEV_ORGANIZATION_ID, DEV_PROJECT_ID } from "../src/constants.js";

const OTHER_ORG = "org_01JXYZ000000000099";

interface SetupOptions {
  scopes?: ApiKeyScope[];
  capabilities?: Partial<ProviderCapabilities>;
  organizationId?: string;
}

async function setup(options: SetupOptions = {}) {
  const config = loadConfig({
    NODE_ENV: "test",
    WEBHOOK_SIGNING_SECRET: "test-secret-yang-cukup-panjang",
  });
  const providers = new ProviderRegistry();
  providers.register(new InMemoryProvider({ capabilities: options.capabilities ?? { text: true } }));
  const apiKeys = new InMemoryApiKeyStore();
  const primary = apiKeys.add({
    organization_id: options.organizationId ?? DEV_ORGANIZATION_ID,
    project_id: DEV_PROJECT_ID,
    scopes: options.scopes ?? [...ALL_SCOPES],
  });
  const secondary = apiKeys.add({
    organization_id: OTHER_ORG,
    project_id: DEV_PROJECT_ID,
    scopes: [...ALL_SCOPES],
  });
  const app = await buildApp({
    config,
    providers,
    apiKeys,
    stores: createStores(),
    eventBus: new InMemoryEventBus(),
    outbox: new InMemoryOutbox(),
  });
  return { app, primaryKey: primary.rawKey, secondaryKey: secondary.rawKey };
}

const payload = {
  provider: "in-memory",
  to: "+6281234567890",
  type: "text",
  text: { body: "Halo dari tes" },
};

let activeApp: FastifyInstance | undefined;
afterEach(async () => {
  await activeApp?.close();
  activeApp = undefined;
});

describe("API health dan auth", () => {
  it("health tanpa autentikasi", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");
  });

  it("menolak permintaan tanpa API key", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({ method: "GET", url: "/v1/providers" });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe("AUTHENTICATION_ERROR");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("menolak API key palsu", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "GET",
      url: "/v1/providers",
      headers: { authorization: "Bearer uw_test_palsu" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("mengembalikan daftar provider pada envelope standar", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "GET",
      url: "/v1/providers",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].id).toBe("in-memory");
    expect(response.json().meta.request_id).toMatch(/^req_/);
  });
});

describe("pengiriman pesan", () => {
  it("menerima pesan dan menghasilkan event", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.primaryKey}`, "idempotency-key": "order-1" },
      payload,
    });
    expect(response.statusCode).toBe(200);
    const message = response.json().data;
    expect(message.status).toBe("accepted");
    expect(message.organization_id).toBe(DEV_ORGANIZATION_ID);

    const events = await ctx.app.inject({
      method: "GET",
      url: "/v1/events",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
    });
    expect(events.json().data[0].type).toBe("message.accepted");
  });

  it("idempoten untuk kunci yang sama", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const headers = { authorization: `Bearer ${ctx.primaryKey}`, "idempotency-key": "order-2" };
    const first = await ctx.app.inject({ method: "POST", url: "/v1/messages", headers, payload });
    const second = await ctx.app.inject({ method: "POST", url: "/v1/messages", headers, payload });
    expect(first.json().data.id).toBe(second.json().data.id);
  });

  it("menolak kunci idempotensi dipakai ulang dengan payload beda", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const headers = { authorization: `Bearer ${ctx.primaryKey}`, "idempotency-key": "order-3" };
    await ctx.app.inject({ method: "POST", url: "/v1/messages", headers, payload });
    const conflict = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers,
      payload: { ...payload, text: { body: "Pesan berbeda" } },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("menolak capability yang tidak didukung", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
      payload: {
        provider: "in-memory",
        to: "+6281234567890",
        type: "image",
        media: { url: "https://example.com/a.png" },
      },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("UNSUPPORTED_CAPABILITY");
  });

  it("menolak scope yang tidak memadai", async () => {
    const ctx = await setup({ scopes: ["providers:read"] });
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
      payload,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("AUTHORIZATION_ERROR");
  });

  it("mengisolasi pesan antar organisasi", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const sent = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
      payload,
    });
    const id = sent.json().data.id as string;

    const other = await ctx.app.inject({
      method: "GET",
      url: `/v1/messages/${id}`,
      headers: { authorization: `Bearer ${ctx.secondaryKey}` },
    });
    expect(other.statusCode).toBe(404);
  });
});

describe("webhook dan usage", () => {
  it("membuat dan menguji webhook", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const created = await ctx.app.inject({
      method: "POST",
      url: "/v1/webhooks",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
      payload: { url: "https://example.com/hook", events: ["message.delivered"] },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().data.id as string;

    const tested = await ctx.app.inject({
      method: "POST",
      url: `/v1/webhooks/${id}/test`,
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
    });
    expect(tested.statusCode).toBe(200);
    expect(tested.json().data.headers["x-unwhats-signature"]).toMatch(/^sha256=/);
  });

  it("mencatat statistik penggunaan", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
      payload,
    });
    const usage = await ctx.app.inject({
      method: "GET",
      url: "/v1/usage",
      headers: { authorization: `Bearer ${ctx.primaryKey}` },
    });
    expect(usage.json().data.messages_accepted).toBe(1);
    expect(usage.json().data.api_requests).toBeGreaterThanOrEqual(2);
  });
});
