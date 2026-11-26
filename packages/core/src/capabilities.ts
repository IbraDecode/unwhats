import type { MessageType, ProviderCapabilities } from "@unwhats/contracts";
import { UnWhatsError } from "@unwhats/errors";

export const CAPABILITIES = [
  "text",
  "media",
  "templates",
  "interactive",
  "inbound_messages",
  "delivery_receipts",
  "read_receipts",
  "groups",
  "calling",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const TYPE_TO_CAPABILITY: Readonly<Record<MessageType, Capability>> = {
  text: "text",
  image: "media",
  video: "media",
  audio: "media",
  document: "media",
  template: "templates",
  interactive: "interactive",
};

export function requiredCapability(type: MessageType): Capability {
  return TYPE_TO_CAPABILITY[type];
}

export function hasCapability(capabilities: ProviderCapabilities, capability: Capability): boolean {
  return capabilities[capability] === true;
}

/**
 * Registry kecil yang dipakai API untuk menjawab pertanyaan:
 * "apakah provider ini boleh melakukan aksi ini?"
 */
export class CapabilityRegistry {
  private readonly entries = new Map<string, ProviderCapabilities>();

  register(providerId: string, capabilities: ProviderCapabilities): void {
    this.entries.set(providerId, capabilities);
  }

  get(providerId: string): ProviderCapabilities | undefined {
    return this.entries.get(providerId);
  }

  has(providerId: string, capability: Capability): boolean {
    const capabilities = this.entries.get(providerId);
    return capabilities !== undefined && hasCapability(capabilities, capability);
  }

  assert(providerId: string, capability: Capability): void {
    if (!this.has(providerId, capability)) {
      throw new UnWhatsError({
        code: "UNSUPPORTED_CAPABILITY",
        details: { provider_id: providerId, capability },
      });
    }
  }

  assertForMessageType(providerId: string, type: MessageType): void {
    this.assert(providerId, requiredCapability(type));
  }

  list(): ReadonlyArray<{ provider_id: string; capabilities: ProviderCapabilities }> {
    return [...this.entries].map(([provider_id, capabilities]) => ({ provider_id, capabilities }));
  }

  clear(): void {
    this.entries.clear();
  }
}

export function emptyCapabilities(): ProviderCapabilities {
  return {
    version: "1",
    text: false,
    media: false,
    templates: false,
    interactive: false,
    inbound_messages: false,
    delivery_receipts: false,
    read_receipts: false,
    groups: false,
    calling: false,
  };
}
