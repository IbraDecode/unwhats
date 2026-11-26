import { createHash } from "node:crypto";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { AppConfig } from "@unwhats/config";
import {
  PaginationQuerySchema,
  SendMessageInputSchema,
  CreateWebhookInputSchema,
  UpdateWebhookInputSchema,
  type AuthenticatedPrincipal,
  type Message,
} from "@unwhats/contracts";
import { createEvent, createId, hasCapability, requiredCapability } from "@unwhats/core";
import { UnWhatsError, toUnWhatsError } from "@unwhats/errors";
import type { EventBus, OutboxStore } from "@unwhats/event-bus";
import { createLogger, type Logger } from "@unwhats/logger";
import type { ProviderRegistry } from "@unwhats/provider-sdk";
import { buildWebhookHeaders } from "@unwhats/webhook";
import { z } from "zod";
import { extractBearer, InMemoryApiKeyStore, requireScope } from "./auth.js";
import { DEV_ORGANIZATION_ID, DEV_PROJECT_ID, SERVICE_NAME } from "./constants.js";
import {
  InMemoryEventStore,
  InMemoryIdempotencyStore,
  InMemoryMessageStore,
  InMemoryProjectStore,
  InMemoryWebhookStore,
  UsageCounters,
} from "./stores.js";

declare module "fastify" {
  interface FastifyRequest {
    principal?: AuthenticatedPrincipal;
  }
}

export interface AppStores {
  messages: InMemoryMessageStore;
  webhooks: InMemoryWebhookStore;
  idempotency: InMemoryIdempotencyStore;
  projects: InMemoryProjectStore;
  events: InMemoryEventStore;
  counters: UsageCounters;
}

export function createStores(): AppStores {
  return {
    messages: new InMemoryMessageStore(),
    webhooks: new InMemoryWebhookStore(),
    idempotency: new InMemoryIdempotencyStore(),
    projects: new InMemoryProjectStore(),
    events: new InMemoryEventStore(),
    counters: new UsageCounters(),
  };
}

export interface BuildAppOptions {
  config: AppConfig;
  providers: ProviderRegistry;
  eventBus: EventBus;
  outbox: OutboxStore;
  apiKeys: InMemoryApiKeyStore;
  stores: AppStores;
  logger?: Logger;
}

function bodyHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
}

function envelope(requestId: string, data: unknown) {
  return { data, meta: { request_id: requestId } };
}

function principalOf(request: FastifyRequest): AuthenticatedPrincipal {
  if (request.principal === undefined) {
    throw new UnWhatsError({ code: "AUTHENTICATION_ERROR" });
  }
  return request.principal;
}

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new UnWhatsError({
      code: "VALIDATION_ERROR",
      details: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }
  return parsed.data;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const logger = options.logger ?? createLogger({ name: SERVICE_NAME, level: options.config.LOG_LEVEL });
  const requestIds = new WeakMap<FastifyRequest, string>();
  const rid = (request: FastifyRequest): string => requestIds.get(request) ?? "req_unknown";

  const app = Fastify({
    logger: false,
    trustProxy: options.config.TRUST_PROXY === "true",
    bodyLimit: 1_048_576,
  });

  for (const provider of options.providers.list()) {
    if (provider.getLifecycle?.() === "registered") {
      await provider.initialize({
        organization_id: DEV_ORGANIZATION_ID,
        project_id: DEV_PROJECT_ID,
        config: {},
        logger,
      });
    }
  }

  if (options.config.API_KEY_DEV !== undefined) {
    options.apiKeys.add({
      organization_id: DEV_ORGANIZATION_ID,
      project_id: DEV_PROJECT_ID,
      rawKey: options.config.API_KEY_DEV,
    });
  }

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const headerId = request.headers["x-request-id"];
    const requestId = typeof headerId === "string" && headerId.length > 0 ? headerId : createId("req");
    requestIds.set(request, requestId);
    void reply.header("x-request-id", requestId);

    const path = new URL(request.url, "http://localhost").pathname;
    if (path === "/health" || path === "/ready") return;

    const apiKeyHeader = request.headers["x-api-key"];
    const rawKey =
      extractBearer(request.headers.authorization) ??
      extractBearer(typeof apiKeyHeader === "string" ? apiKeyHeader : undefined);
    if (rawKey === null) {
      throw new UnWhatsError({ code: "AUTHENTICATION_ERROR", requestId });
    }
    request.principal = options.apiKeys.authenticate(rawKey);
    options.stores.counters.increment("api_requests");
  });

  app.setErrorHandler((error, request, reply) => {
    const wrapped = toUnWhatsError(error, rid(request));
    logger.error("permintaan gagal", {
      request_id: rid(request),
      code: wrapped.code,
      http_status: wrapped.httpStatus,
    });
    void reply.code(wrapped.httpStatus).send(wrapped.toPayload());
  });

  app.setNotFoundHandler((request, reply) => {
    const error = new UnWhatsError({ code: "RESOURCE_NOT_FOUND", requestId: rid(request) });
    void reply.code(404).send(error.toPayload());
  });

  app.addHook("onClose", async () => {
    await options.eventBus.close();
  });

  // ----- Health -----
  app.get("/health", async () => ({
    status: "ok",
    service: SERVICE_NAME,
    version: options.config.SERVICE_VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    checked_at: new Date().toISOString(),
  }));

  app.get("/ready", async (_request, reply) => {
    const checks = {
      providers: options.providers.list().length > 0,
      api_keys: options.apiKeys.list(DEV_ORGANIZATION_ID).length > 0,
    };
    const ready = Object.values(checks).every(Boolean);
    if (!ready) void reply.code(503);
    return { ready, checks };
  });

  // ----- Projects -----
  app.get("/v1/projects", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "providers:read");
    return envelope(rid(request), options.stores.projects.list(principal.organization_id));
  });

  app.post("/v1/projects", async (request, reply) => {
    const principal = principalOf(request);
    requireScope(principal, "providers:read");
    const input = parseOrThrow(z.object({ name: z.string().min(1).max(200) }), request.body);
    const project = options.stores.projects.create(principal.organization_id, input.name);
    void reply.code(201);
    return envelope(rid(request), project);
  });

  // ----- Providers -----
  app.get("/v1/providers", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "providers:read");
    return envelope(rid(request), await options.providers.descriptors());
  });

  app.get("/v1/providers/:id", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "providers:read");
    const { id } = request.params as { id: string };
    const descriptor = (await options.providers.descriptors()).find((item) => item.id === id);
    if (descriptor === undefined) {
      throw new UnWhatsError({ code: "RESOURCE_NOT_FOUND", details: { provider_id: id } });
    }
    return envelope(rid(request), descriptor);
  });

  app.get("/v1/providers/:id/capabilities", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "providers:read");
    const { id } = request.params as { id: string };
    const provider = options.providers.get(id);
    if (provider === undefined) {
      throw new UnWhatsError({ code: "RESOURCE_NOT_FOUND", details: { provider_id: id } });
    }
    return envelope(rid(request), await provider.getCapabilities());
  });

  // ----- Messages -----
  app.post("/v1/messages", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "messages:write");
    const input = parseOrThrow(SendMessageInputSchema, request.body);
    const requestId = rid(request);

    const idempotencyHeader = request.headers["idempotency-key"];
    const idempotencyKey =
      typeof idempotencyHeader === "string" && idempotencyHeader.length > 0
        ? idempotencyHeader
        : undefined;
    const hash = bodyHash(request.body);

    if (idempotencyKey !== undefined) {
      const cached = options.stores.idempotency.get(
        principal.organization_id,
        idempotencyKey,
        hash,
      );
      if (cached !== undefined) return cached;
    }

    const provider = options.providers.require(input.provider);
    const capabilities = await provider.getCapabilities();
    if (!hasCapability(capabilities, requiredCapability(input.type))) {
      throw new UnWhatsError({
        code: "UNSUPPORTED_CAPABILITY",
        details: { provider_id: provider.id, capability: requiredCapability(input.type) },
      });
    }

    const result = await provider.sendMessage(input);
    const message: Message = {
      ...result.message,
      organization_id: principal.organization_id,
      project_id: principal.project_id ?? DEV_PROJECT_ID,
    };
    options.stores.messages.save(message);

    const event = createEvent({
      type: "message.accepted",
      organization_id: principal.organization_id,
      correlation_id: requestId,
      data: {
        message_id: message.id,
        provider: provider.id,
        status: message.status,
      },
    });
    options.stores.events.append(event);
    await options.outbox.append(event);
    await options.eventBus.publish(event);
    options.stores.counters.increment("messages_accepted");

    const response = envelope(requestId, message);
    if (idempotencyKey !== undefined) {
      options.stores.idempotency.save(principal.organization_id, idempotencyKey, hash, response);
    }
    return response;
  });

  app.get("/v1/messages", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "messages:read");
    const query = parseOrThrow(PaginationQuerySchema, request.query);
    const messages = options.stores.messages.list(principal.organization_id);
    const startIndex =
      query.starting_after === undefined
        ? 0
        : Math.max(0, messages.findIndex((item) => item.id === query.starting_after) + 1);
    const page = messages.slice(startIndex, startIndex + query.limit);
    const hasMore = startIndex + query.limit < messages.length;
    return {
      data: page,
      has_more: hasMore,
      next_cursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  });

  app.get("/v1/messages/:id", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "messages:read");
    const { id } = request.params as { id: string };
    const message = options.stores.messages.get(principal.organization_id, id);
    if (message === undefined) {
      throw new UnWhatsError({ code: "RESOURCE_NOT_FOUND", details: { message_id: id } });
    }
    return envelope(rid(request), message);
  });

  // ----- Webhooks -----
  app.get("/v1/webhooks", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "webhooks:read");
    return envelope(rid(request), options.stores.webhooks.list(principal.organization_id));
  });

  app.post("/v1/webhooks", async (request, reply) => {
    const principal = principalOf(request);
    requireScope(principal, "webhooks:write");
    const input = parseOrThrow(CreateWebhookInputSchema, request.body);
    const webhook = options.stores.webhooks.create(
      principal.organization_id,
      principal.project_id ?? DEV_PROJECT_ID,
      input,
    );
    void reply.code(201);
    return envelope(rid(request), webhook);
  });

  app.patch("/v1/webhooks/:id", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "webhooks:write");
    const { id } = request.params as { id: string };
    const patch = parseOrThrow(UpdateWebhookInputSchema, request.body);
    const webhook = options.stores.webhooks.update(principal.organization_id, id, {
      ...(patch.url !== undefined ? { url: patch.url } : {}),
      ...(patch.events !== undefined ? { events: patch.events } : {}),
      ...(patch.description !== undefined ? { description: patch.description ?? null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    return envelope(rid(request), webhook);
  });

  app.delete("/v1/webhooks/:id", async (request, reply) => {
    const principal = principalOf(request);
    requireScope(principal, "webhooks:write");
    const { id } = request.params as { id: string };
    options.stores.webhooks.delete(principal.organization_id, id);
    void reply.code(204);
    return null;
  });

  app.post("/v1/webhooks/:id/test", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "webhooks:write");
    const { id } = request.params as { id: string };
    const webhook = options.stores.webhooks
      .list(principal.organization_id)
      .find((item) => item.id === id);
    if (webhook === undefined) {
      throw new UnWhatsError({ code: "RESOURCE_NOT_FOUND", details: { webhook_id: id } });
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: createId("evt"),
      type: "message.delivered",
      version: "2026-01-01",
      created_at: new Date().toISOString(),
      correlation_id: rid(request),
      organization_id: principal.organization_id,
      data: { test: true },
    });
    const headers = buildWebhookHeaders({
      secret: options.config.WEBHOOK_SIGNING_SECRET,
      payload,
      timestamp,
      eventType: "message.delivered",
      deliveryId: createId("dlv"),
    });
    options.stores.counters.increment("webhook_deliveries");
    return envelope(rid(request), {
      webhook_id: webhook.id,
      delivery_id: headers["x-unwhats-delivery"],
      event: JSON.parse(payload),
      headers,
    });
  });

  // ----- Usage & Events -----
  app.get("/v1/usage", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "usage:read");
    const end = new Date();
    const start = new Date(end.getTime() - 86_400_000);
    return envelope(rid(request), {
      object: "usage",
      organization_id: principal.organization_id,
      period: { start: start.toISOString(), end: end.toISOString() },
      api_requests: options.stores.counters.value("api_requests"),
      messages_accepted: options.stores.counters.value("messages_accepted"),
      messages_delivered: options.stores.counters.value("messages_delivered"),
      webhook_deliveries: options.stores.counters.value("webhook_deliveries"),
    });
  });

  app.get("/v1/events", async (request) => {
    const principal = principalOf(request);
    requireScope(principal, "messages:read");
    const query = request.query as { type?: string; limit?: string };
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    return envelope(
      rid(request),
      options.stores.events.list(principal.organization_id, query.type).slice(0, limit),
    );
  });

  await app.ready();
  return app;
}
