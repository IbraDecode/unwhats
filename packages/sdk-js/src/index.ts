import type {
  CreateWebhookInput,
  DomainEvent,
  HealthResponseSchemaType,
  Message,
  PaginationQuery,
  ProviderDescriptor,
  SendMessageInput,
  Usage,
  WebhookEndpoint,
} from "./types.js";
import { ERROR_CODES, UnWhatsError, type UnWhatsErrorCode } from "@unwhats/errors";

export interface UnWhatsClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  sdkVersion?: string;
}

interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
}

export class UnWhatsClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly sdkVersion: string;

  constructor(options: UnWhatsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.sdkVersion = options.sdkVersion ?? "0.1.0";
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${options.path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `unwhats-sdk-js/${this.sdkVersion}`,
      "X-UnWhats-SDK-Version": this.sdkVersion,
    };
    if (options.idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    const response = await this.fetchImpl(url, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const text = await response.text();
    const payload: unknown = text.length > 0 ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw parseApiError(payload, response.headers.get("x-request-id") ?? undefined);
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "data" in payload &&
      (payload as { data: unknown }).data !== undefined
    ) {
      return (payload as { data: T }).data;
    }
    return payload as T;
  }

  health() {
    return this.request<HealthResponseSchemaType>({ method: "GET", path: "/health" });
  }

  listProviders() {
    return this.request<ProviderDescriptor[]>({ method: "GET", path: "/v1/providers" });
  }

  getProvider(id: string) {
    return this.request<ProviderDescriptor>({
      method: "GET",
      path: `/v1/providers/${encodeURIComponent(id)}`,
    });
  }

  sendMessage(input: SendMessageInput, idempotencyKey?: string) {
    return this.request<Message>({
      method: "POST",
      path: "/v1/messages",
      body: input,
      idempotencyKey,
    });
  }

  getMessage(id: string) {
    return this.request<Message>({
      method: "GET",
      path: `/v1/messages/${encodeURIComponent(id)}`,
    });
  }

  listMessages(query: PaginationQuery = { limit: 20 }) {
    return this.request<Message[]>({ method: "GET", path: "/v1/messages", query });
  }

  listWebhooks() {
    return this.request<WebhookEndpoint[]>({ method: "GET", path: "/v1/webhooks" });
  }

  createWebhook(input: CreateWebhookInput) {
    return this.request<WebhookEndpoint>({ method: "POST", path: "/v1/webhooks", body: input });
  }

  getUsage() {
    return this.request<Usage>({ method: "GET", path: "/v1/usage" });
  }

  listEvents(query: { type?: string; limit?: number } = {}) {
    return this.request<DomainEvent[]>({ method: "GET", path: "/v1/events", query });
  }
}

function parseApiError(payload: unknown, requestId?: string): UnWhatsError {
  const candidate =
    typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as { error: Record<string, unknown> }).error
      : undefined;

  const rawCode = candidate?.["code"];
  const code: UnWhatsErrorCode =
    typeof rawCode === "string" && (ERROR_CODES as readonly string[]).includes(rawCode)
      ? (rawCode as UnWhatsErrorCode)
      : "INTERNAL_ERROR";

  return new UnWhatsError({
    code,
    message: typeof candidate?.["message"] === "string" ? candidate["message"] : undefined,
    requestId:
      typeof candidate?.["request_id"] === "string"
        ? candidate["request_id"]
        : requestId,
    retryable: candidate?.["retryable"] === true,
    details: candidate?.["details"] as Record<string, unknown> | undefined,
  });
}

export { UnWhatsError } from "@unwhats/errors";
