import type {
  Message,
  ProviderCapabilities,
  ProviderHealth,
  SendMessageInput,
  SendMessageResult,
} from "@unwhats/contracts";
import { createMessage } from "@unwhats/core";
import { BaseProvider, type ProviderContext } from "@unwhats/provider-sdk";
import type { MetaProviderConfig } from "./config.js";
import { MetaCloudClient } from "./client.js";

export const META_PROVIDER_ID = "meta-cloud";

export interface MetaCloudProviderOptions {
  config: MetaProviderConfig;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const META_CAPABILITIES: ProviderCapabilities = {
  version: "1",
  text: true,
  media: true,
  templates: true,
  interactive: true,
  inbound_messages: true,
  delivery_receipts: true,
  read_receipts: true,
  groups: false,
  calling: false,
};

/**
 * Adapter produksi untuk Meta WhatsApp Cloud API.
 * Semua konektivitas memakai endpoint resmi dan kredensial yang disediakan.
 */
export class MetaCloudProvider extends BaseProvider {
  readonly id = META_PROVIDER_ID;
  readonly name = "Meta WhatsApp Cloud API";
  readonly version = "0.1.0";
  readonly description = "Provider resmi WhatsApp Business Platform";
  readonly production_ready = true;

  private readonly client: MetaCloudClient;

  constructor(options: MetaCloudProviderOptions) {
    super();
    this.client = new MetaCloudClient({
      config: options.config,
      fetchImpl: options.fetchImpl,
      timeoutMs: options.timeoutMs,
    });
  }

  protected async loadCapabilities(): Promise<ProviderCapabilities> {
    return { ...META_CAPABILITIES };
  }

  protected async doSendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const context = this.requireContext();
    const providerMessageId = await this.client.sendMessage(input);
    const message = createMessage({
      organization_id: context.organization_id,
      project_id: context.project_id,
      provider_id: this.id,
      direction: "outbound",
      type: input.type,
      to: input.to,
      text: input.text ?? null,
      template: input.template ?? null,
      media: input.media ?? null,
      interactive: input.interactive ?? null,
      metadata: input.metadata,
      status: "accepted",
      provider_message_id: providerMessageId,
      provider_message_status: "accepted",
    });
    return { message, provider_message_id: providerMessageId };
  }

  /**
   * Cloud API tidak menyediakan endpoint generik untuk mengambil pesan
   * terkirim berdasarkan ID. Status dilacak lewat webhook `statuses`.
   */
  protected async doGetMessage(_id: string): Promise<Message | null> {
    return null;
  }

  protected async doHealthCheck(): Promise<ProviderHealth> {
    const latencyMs = await this.client.healthCheck();
    return {
      status: latencyMs > 10_000 ? "degraded" : "healthy",
      latency_ms: latencyMs,
      checked_at: new Date().toISOString(),
      details: { provider_id: this.id },
    };
  }

  async listTemplates(): Promise<unknown[]> {
    this.ensureReady();
    return this.client.listTemplates();
  }

  async createTemplate(input: Record<string, unknown>): Promise<unknown> {
    this.ensureReady();
    return this.client.createTemplate(input);
  }

  /** Dipakai API untuk memvalidasi konteks tenant saat menerima webhook. */
  contextOrThrow(): ProviderContext {
    return this.requireContext();
  }
}
