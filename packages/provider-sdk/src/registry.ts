import type { ProviderDescriptor, ProviderLifecycle } from "@unwhats/contracts";
import { UnWhatsError } from "@unwhats/errors";
import type { MessagingProvider, ProviderContext } from "./provider.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, MessagingProvider>();

  register(provider: MessagingProvider): void {
    if (this.providers.has(provider.id)) {
      throw new UnWhatsError({
        code: "CONFIGURATION_ERROR",
        message: `Provider ${provider.id} sudah terdaftar`,
        details: { provider_id: provider.id },
      });
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): MessagingProvider | undefined {
    return this.providers.get(id);
  }

  require(id: string): MessagingProvider {
    const provider = this.providers.get(id);
    if (provider === undefined) {
      throw new UnWhatsError({
        code: "RESOURCE_NOT_FOUND",
        message: `Provider ${id} tidak ditemukan`,
        details: { provider_id: id },
      });
    }
    return provider;
  }

  list(): MessagingProvider[] {
    return [...this.providers.values()];
  }

  ids(): string[] {
    return [...this.providers.keys()];
  }

  async descriptors(): Promise<ProviderDescriptor[]> {
    return Promise.all(
      this.list().map(async (provider) => {
        if (provider.getDescriptor !== undefined) return provider.getDescriptor();
        return {
          id: provider.id,
          name: provider.name,
          version: provider.version,
          description: provider.description,
          lifecycle: "registered" as ProviderLifecycle,
          capabilities: await provider.getCapabilities(),
          production_ready: provider.production_ready,
        };
      }),
    );
  }

  async initializeAll(context: ProviderContext): Promise<void> {
    await Promise.all(this.list().map((provider) => provider.initialize(context)));
  }

  async shutdownAll(): Promise<void> {
    await Promise.all(this.list().map((provider) => provider.shutdown()));
  }
}
