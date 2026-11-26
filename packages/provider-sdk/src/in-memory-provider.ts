import type {
  Message,
  ProviderCapabilities,
  ProviderHealth,
  SendMessageInput,
  SendMessageResult,
} from "@unwhats/contracts";
import { createMessage, emptyCapabilities, createId } from "@unwhats/core";
import { BaseProvider } from "./provider.js";

export interface InMemoryProviderOptions {
  id?: string;
  name?: string;
  production_ready?: boolean;
  capabilities?: Partial<ProviderCapabilities>;
  failNext?: boolean;
}

/**
 * Provider deterministik untuk testing, playground, dan contoh dokumentasi.
 * Bukan konektor produksi dan tidak terhubung ke WhatsApp.
 */
export class InMemoryProvider extends BaseProvider {
  readonly id: string;
  readonly name: string;
  readonly version = "0.1.0";
  readonly description: string;
  readonly production_ready: boolean;

  private readonly capabilityOverride: Partial<ProviderCapabilities>;
  private readonly messages = new Map<string, Message>();
  private failNextValue: boolean;

  constructor(options: InMemoryProviderOptions = {}) {
    super();
    this.id = options.id ?? "in-memory";
    this.name = options.name ?? "In-Memory Provider";
    this.description = "Provider lokal untuk pengembangan dan pengujian";
    this.production_ready = options.production_ready ?? false;
    this.capabilityOverride = options.capabilities ?? { text: true };
    this.failNextValue = options.failNext ?? false;
  }

  failNext(value = true): void {
    this.failNextValue = value;
  }

  protected async loadCapabilities(): Promise<ProviderCapabilities> {
    return { ...emptyCapabilities(), ...this.capabilityOverride };
  }

  protected async doSendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    if (this.failNextValue) {
      this.failNextValue = false;
      return {
        message: createMessage({
          organization_id: this.requireContext().organization_id,
          project_id: this.requireContext().project_id,
          provider_id: this.id,
          direction: "outbound",
          type: input.type,
          to: input.to,
          text: input.text ?? null,
          template: input.template ?? null,
          media: input.media ?? null,
          metadata: input.metadata,
          status: "failed",
        }),
        provider_message_id: null,
      };
    }

    const providerMessageId = createId("acc");
    const message = createMessage({
      organization_id: this.requireContext().organization_id,
      project_id: this.requireContext().project_id,
      provider_id: this.id,
      direction: "outbound",
      type: input.type,
      to: input.to,
      text: input.text ?? null,
      template: input.template ?? null,
      media: input.media ?? null,
      metadata: input.metadata,
      status: "accepted",
      provider_message_id: providerMessageId,
      provider_message_status: "accepted",
    });
    this.messages.set(message.id, message);
    return { message, provider_message_id: providerMessageId };
  }

  protected async doGetMessage(id: string): Promise<Message | null> {
    return this.messages.get(id) ?? null;
  }

  protected async doHealthCheck(): Promise<ProviderHealth> {
    return {
      status: "healthy",
      latency_ms: 0,
      checked_at: new Date().toISOString(),
      details: { messages_in_memory: this.messages.size },
    };
  }
}
