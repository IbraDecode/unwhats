import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "@unwhats/config";
import { InMemoryEventBus, InMemoryOutbox } from "@unwhats/event-bus";
import { MetaCloudProvider, parseMetaConfig, META_PROVIDER_ID } from "@unwhats/provider-meta";
import { ProviderRegistry } from "@unwhats/provider-sdk";
import { ALL_SCOPES, InMemoryApiKeyStore } from "../src/auth.js";
import { buildApp, createStores } from "../src/app.js";
import { DEV_ORGANIZATION_ID, DEV_PROJECT_ID, META_WEBHOOK_PATH } from "../src/constants.js";

const APP_SECRET = "app-secret-panjang-untuk-test";
const VERIFY_TOKEN = "verify-token-123";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

function signature(payload: string): string {
  return `sha256=${createHmac("sha256", APP_SECRET).update(payload).digest("hex")}`;
}

async function setup(fetchImpl?: typeof fetch) {
  const config = loadConfig({
    NODE_ENV: "test",
    WEBHOOK_SIGNING_SECRET: "test-secret-yang-cukup-panjang",
    META_ACCESS_TOKEN: "test-token",
    META_PHONE_NUMBER_ID: "123456789",
    META_BUSINESS_ACCOUNT_ID: "987654321",
    META_APP_SECRET: APP_SECRET,
    META_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
  });
  const providers = new ProviderRegistry();
  providers.register(
    new MetaCloudProvider({
      config: parseMetaConfig({
        access_token: config.META_ACCESS_TOKEN,
        phone_number_id: config.META_PHONE_NUMBER_ID,
        business_account_id: config.META_BUSINESS_ACCOUNT_ID,
        api_version: config.META_API_VERSION,
        base_url: config.META_BASE_URL,
        app_secret: config.META_APP_SECRET,
        webhook_verify_token: config.META_WEBHOOK_VERIFY_TOKEN,
      }),
      fetchImpl,
    }),
  );
  const apiKeys = new InMemoryApiKeyStore();
  const key = apiKeys.add({
    organization_id: DEV_ORGANIZATION_ID,
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
  return { app, apiKey: key.rawKey };
}

const inboundBody = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "123456789" },
            contacts: [{ wa_id: "6281234567890", profile: { name: "Ibra" } }],
            messages: [
              {
                id: "wamid.in.1",
                from: "6281234567890",
                timestamp: "1795651200",
                type: "text",
                text: { body: "Halo balik" },
              },
            ],
          },
        },
      ],
    },
  ],
};

function statusBody(status: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "123456789" },
              statuses: [
                {
                  id: "wamid.out.1",
                  status,
                  timestamp: "1795651201",
                  recipient_id: "6281234567890",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function signedPost(app: FastifyInstance, body: unknown) {
  const raw = JSON.stringify(body);
  return app.inject({
    method: "POST",
    url: META_WEBHOOK_PATH,
    headers: { "content-type": "application/json", "x-hub-signature-256": signature(raw) },
    payload: raw,
  });
}

let activeApp: FastifyInstance | undefined;
afterEach(async () => {
  await activeApp?.close();
  activeApp = undefined;
});

describe("verifikasi webhook Meta di API", () => {
  it("mengembalikan challenge saat token valid", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "GET",
      url: `${META_WEBHOOK_PATH}?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=${VERIFY_TOKEN}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("abc123");
  });

  it("menolak verify token salah", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "GET",
      url: `${META_WEBHOOK_PATH}?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=salah`,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("AUTHORIZATION_ERROR");
  });

  it("menolak POST tanpa signature", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "POST",
      url: META_WEBHOOK_PATH,
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(inboundBody),
    });
    expect(response.statusCode).toBe(403);
  });
});

describe("ingestion pesan dan status", () => {
  it("menyimpan pesan masuk dan event message.received", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    const response = await signedPost(ctx.app, inboundBody);
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ received: 1, processed: 1, skipped: 0 });

    const messages = await ctx.app.inject({
      method: "GET",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(messages.json().data[0]).toMatchObject({
      direction: "inbound",
      from: "6281234567890",
      type: "text",
      provider_id: META_PROVIDER_ID,
    });

    const events = await ctx.app.inject({
      method: "GET",
      url: "/v1/events",
      headers: { authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(events.json().data[0].type).toBe("message.received");
  });

  it("mengabaikan webhook duplikat", async () => {
    const ctx = await setup();
    activeApp = ctx.app;
    await signedPost(ctx.app, inboundBody);
    const second = await signedPost(ctx.app, inboundBody);
    expect(second.json().data).toMatchObject({ received: 1, processed: 0, skipped: 1 });
  });

  it("mengubah status pesan keluar menjadi delivered", async () => {
    const fetchImpl = mockFetch(200, { messages: [{ id: "wamid.out.1" }] });
    const ctx = await setup(fetchImpl);
    activeApp = ctx.app;

    const sent = await ctx.app.inject({
      method: "POST",
      url: "/v1/messages",
      headers: { authorization: `Bearer ${ctx.apiKey}` },
      payload: {
        provider: META_PROVIDER_ID,
        to: "+6281234567890",
        type: "text",
        text: { body: "Halo" },
      },
    });
    expect(sent.statusCode).toBe(200);
    const id = sent.json().data.id as string;

    const webhook = await signedPost(ctx.app, statusBody("delivered"));
    expect(webhook.json().data.processed).toBe(1);

    const detail = await ctx.app.inject({
      method: "GET",
      url: `/v1/messages/${id}`,
      headers: { authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(detail.json().data.status).toBe("delivered");

    const events = await ctx.app.inject({
      method: "GET",
      url: "/v1/events?type=message.delivered",
      headers: { authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(events.json().data.length).toBe(1);
  });

  it("menyediakan daftar template dari provider", async () => {
    const fetchImpl = mockFetch(200, { data: [{ id: "tpl_1", name: "hello" }] });
    const ctx = await setup(fetchImpl);
    activeApp = ctx.app;
    const response = await ctx.app.inject({
      method: "GET",
      url: "/v1/templates",
      headers: { authorization: `Bearer ${ctx.apiKey}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].name).toBe("hello");
  });
});
