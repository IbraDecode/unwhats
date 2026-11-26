import type {
  Message,
  ProviderCapabilities,
  ProviderDescriptor,
  ProviderHealth,
  ProviderLifecycle,
  SendMessageInput,
  SendMessageResult,
} from "@unwhats/contracts";
import { requiredCapability, hasCapability } from "@unwhats/core";
import { UnWhatsError } from "@unwhats/errors";

export interface ProviderLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface ProviderContext {
  organization_id: string;
  project_id: string;
  config: Record<string, unknown>;
  logger?: ProviderLogger;
}

/**
 * Kontrak provider stabil. Implementasi boleh berbeda, tetapi kontrak ini
 * tidak boleh berubah tanpa perubahan versi major pada provider-sdk.
 */
export interface MessagingProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly production_ready: boolean;

  initialize(context: ProviderContext): Promise<void>;
  getCapabilities(): Promise<ProviderCapabilities>;
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  getMessage(id: string): Promise<Message | null>;
  healthCheck(): Promise<ProviderHealth>;
  shutdown(): Promise<void>;

  getLifecycle?(): ProviderLifecycle;
  getDescriptor?(): Promise<ProviderDescriptor>;
}

const LIFECYCLE_TRANSITIONS: Readonly<Record<ProviderLifecycle, readonly ProviderLifecycle[]>> = {
  registered: ["configured", "initializing"],
  configured: ["initializing"],
  initializing: ["ready", "degraded", "failed"],
  ready: ["degraded", "failed", "stopping"],
  degraded: ["ready", "failed", "stopping"],
  failed: ["initializing", "stopping"],
  stopping: ["stopped"],
  stopped: [],
};

export abstract class BaseProvider implements MessagingProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly production_ready: boolean;

  protected context?: ProviderContext;
  private lifecycle: ProviderLifecycle = "registered";
  private cachedCapabilities?: ProviderCapabilities;

  protected abstract loadCapabilities(): Promise<ProviderCapabilities>;
  protected abstract doSendMessage(input: SendMessageInput): Promise<SendMessageResult>;
  protected abstract doGetMessage(id: string): Promise<Message | null>;
  protected abstract doHealthCheck(): Promise<ProviderHealth>;

  protected async onInitialize?(): Promise<void>;
  protected async onShutdown?(): Promise<void>;

  async initialize(context: ProviderContext): Promise<void> {
    this.setLifecycle("initializing");
    this.context = context;
    this.cachedCapabilities = await this.loadCapabilities();
    await this.onInitialize?.();
    this.setLifecycle("ready");
  }

  async getCapabilities(): Promise<ProviderCapabilities> {
    if (this.cachedCapabilities === undefined) {
      this.cachedCapabilities = await this.loadCapabilities();
    }
    return this.cachedCapabilities;
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    this.ensureReady();
    const capability = requiredCapability(input.type);
    const capabilities = await this.getCapabilities();
    if (!hasCapability(capabilities, capability)) {
      throw new UnWhatsError({
        code: "UNSUPPORTED_CAPABILITY",
        details: { provider_id: this.id, capability },
      });
    }
    return this.doSendMessage(input);
  }

  async getMessage(id: string): Promise<Message | null> {
    this.ensureReady();
    return this.doGetMessage(id);
  }

  async healthCheck(): Promise<ProviderHealth> {
    this.ensureReady();
    return this.doHealthCheck();
  }

  async shutdown(): Promise<void> {
    if (this.lifecycle === "stopped" || this.lifecycle === "stopping") return;
    this.setLifecycle("stopping");
    await this.onShutdown?.();
    this.setLifecycle("stopped");
    this.context = undefined;
  }

  getLifecycle(): ProviderLifecycle {
    return this.lifecycle;
  }

  async getDescriptor(): Promise<ProviderDescriptor> {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      lifecycle: this.lifecycle,
      capabilities: await this.getCapabilities(),
      production_ready: this.production_ready,
    };
  }

  protected requireContext(): ProviderContext {
    if (this.context === undefined) {
      throw new UnWhatsError({
        code: "CONFIGURATION_ERROR",
        message: `Provider ${this.id} belum diinisialisasi`,
      });
    }
    return this.context;
  }

  protected ensureReady(): void {
    if (this.lifecycle !== "ready" && this.lifecycle !== "degraded") {
      throw new UnWhatsError({
        code: "PROVIDER_UNAVAILABLE",
        message: `Provider ${this.id} berada dalam status ${this.lifecycle}`,
        details: { provider_id: this.id, lifecycle: this.lifecycle },
      });
    }
  }

  protected setLifecycle(next: ProviderLifecycle): void {
    if (!LIFECYCLE_TRANSITIONS[this.lifecycle].includes(next)) {
      throw new UnWhatsError({
        code: "CONFIGURATION_ERROR",
        message: `Transisi lifecycle ${this.lifecycle} -> ${next} tidak diizinkan`,
        details: { from: this.lifecycle, to: next },
      });
    }
    this.lifecycle = next;
  }

  /** Dipakai adapter saat terjadi degradasi, misalnya webhook gagal. */
  protected markDegraded(): void {
    if (this.lifecycle === "ready") this.setLifecycle("degraded");
  }
}
