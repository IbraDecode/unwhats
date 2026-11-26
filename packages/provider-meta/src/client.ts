import type { SendMessageInput } from "@unwhats/contracts";
import { mapMetaError, mapNetworkError } from "./errors.js";
import type { MetaProviderConfig } from "./config.js";

export interface MetaClientOptions {
  config: MetaProviderConfig;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface MetaMessagePayload {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: string;
  [key: string]: unknown;
}

interface MetaSendResponse {
  messages?: Array<{ id?: string }>;
}

interface MetaMediaResponse {
  id?: string;
}

interface MetaListResponse<T> {
  data?: T[];
}

export class MetaCloudClient {
  private readonly config: MetaProviderConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly base: string;

  constructor(options: MetaClientOptions) {
    this.config = options.config;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.base = `${options.config.base_url.replace(/\/$/, "")}/${options.config.api_version}`;
  }

  private url(path: string): string {
    return `${this.base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ body: T; latencyMs: number }> {
    const started = Date.now();
    try {
      const response = await this.fetchImpl(this.url(path), {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.access_token}`,
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const latencyMs = Date.now() - started;
      const text = await response.text();
      let body: unknown;
      try {
        body = text.length > 0 ? (JSON.parse(text) as T) : undefined;
      } catch {
        body = undefined;
      }
      if (!response.ok) throw mapMetaError(response.status, body);
      return { body: body as T, latencyMs };
    } catch (error) {
      throw mapNetworkError(error);
    }
  }

  private async uploadMedia(file: Blob, filename: string, mimeType: string): Promise<string> {
    const form = new FormData();
    form.set("messaging_product", "whatsapp");
    form.set("type", mimeType);
    form.set("file", file, filename);

    const { body } = await this.request<MetaMediaResponse>(
      `/${this.config.phone_number_id}/media`,
      { method: "POST", body: form },
    );
    if (body.id === undefined) {
      throw mapMetaError(400, { error: { message: "Media upload tanpa ID", code: 131009 } });
    }
    return body.id;
  }

  private async buildPayload(input: SendMessageInput): Promise<MetaMessagePayload> {
    const base: MetaMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to,
      type: input.type,
    };

    switch (input.type) {
      case "text":
        return {
          ...base,
          text: {
            body: input.text?.body ?? "",
            ...(input.text?.preview_url !== undefined
              ? { preview_url: input.text.preview_url }
              : {}),
          },
        };
      case "template":
        return {
          ...base,
          template: {
            name: input.template?.name ?? "",
            language: { code: input.template?.language ?? "id" },
            components: input.template?.components ?? [],
          },
        };
      case "interactive":
        return { ...base, interactive: input.interactive ?? {} };
      case "image":
      case "video":
      case "audio":
      case "document": {
        const media = input.media;
        let mediaId = media?.media_id;
        if (mediaId === undefined && media?.url !== undefined) {
          const response = await this.fetchImpl(media.url, {
            signal: AbortSignal.timeout(this.timeoutMs),
          });
          if (!response.ok) {
            throw mapMetaError(400, {
              error: { message: "Gagal mengunduh media", code: 131009 },
            });
          }
          const blob = await response.blob();
          mediaId = await this.uploadMedia(
            blob,
            media.filename ?? `unwhats-${input.type}`,
            media.mime_type ?? blob.type ?? "application/octet-stream",
          );
        }
        if (mediaId === undefined) {
          throw mapMetaError(400, {
            error: { message: "Media memerlukan media_id atau url", code: 131009 },
          });
        }
        return {
          ...base,
          [input.type]: {
            id: mediaId,
            ...(media?.caption !== undefined ? { caption: media.caption } : {}),
            ...(media?.filename !== undefined && input.type === "document"
              ? { filename: media.filename }
              : {}),
          },
        };
      }
      default:
        throw mapMetaError(400, { error: { message: "Tipe pesan tidak didukung", code: 131009 } });
    }
  }

  async sendMessage(input: SendMessageInput): Promise<string> {
    const payload = await this.buildPayload(input);
    const { body } = await this.request<MetaSendResponse>(
      `/${this.config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const id = body.messages?.[0]?.id;
    if (id === undefined) {
      throw mapMetaError(500, { error: { message: "Respons Meta tanpa message id" } });
    }
    return id;
  }

  async healthCheck(): Promise<number> {
    const { latencyMs } = await this.request(
      `/${this.config.phone_number_id}?fields=verified_name,code_verification_status`,
      { method: "GET" },
    );
    return latencyMs;
  }

  async listTemplates(): Promise<unknown[]> {
    if (this.config.business_account_id === undefined) return [];
    const { body } = await this.request<MetaListResponse<unknown>>(
      `/${this.config.business_account_id}/message_templates?limit=100`,
      { method: "GET" },
    );
    return body.data ?? [];
  }

  async createTemplate(input: Record<string, unknown>): Promise<unknown> {
    if (this.config.business_account_id === undefined) {
      throw mapMetaError(400, {
        error: { message: "business_account_id belum dikonfigurasi", code: 131009 },
      });
    }
    const { body } = await this.request<unknown>(
      `/${this.config.business_account_id}/message_templates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return body;
  }
}
