import type { CreateWebhookInput, DomainEvent, Message, WebhookEndpoint } from "@unwhats/contracts";
import { createId } from "@unwhats/core";
import { UnWhatsError } from "@unwhats/errors";
import { randomBytes } from "node:crypto";

export class InMemoryMessageStore {
  private readonly byOrganization = new Map<string, Message[]>();

  save(message: Message): void {
    const list = this.byOrganization.get(message.organization_id) ?? [];
    list.push(message);
    this.byOrganization.set(message.organization_id, list);
  }

  get(organizationId: string, id: string): Message | undefined {
    return this.byOrganization.get(organizationId)?.find((message) => message.id === id);
  }

  findByProviderMessageId(providerMessageId: string): Message | undefined {
    for (const list of this.byOrganization.values()) {
      const found = list.find((message) => message.provider_message_id === providerMessageId);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  update(message: Message): void {
    const list = this.byOrganization.get(message.organization_id);
    if (list === undefined) return;
    const index = list.findIndex((item) => item.id === message.id);
    if (index >= 0) list[index] = message;
  }

  list(organizationId: string): Message[] {
    return [...(this.byOrganization.get(organizationId) ?? [])].reverse();
  }
}

interface IdempotencyRecord {
  organization_id: string;
  body_hash: string;
  response: unknown;
  created_at: string;
}

export class InMemoryIdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  private key(organizationId: string, key: string): string {
    return `${organizationId}:${key}`;
  }

  get(organizationId: string, key: string, bodyHash: string): unknown | undefined {
    const record = this.records.get(this.key(organizationId, key));
    if (record === undefined) return undefined;
    if (record.body_hash !== bodyHash) {
      throw new UnWhatsError({
        code: "IDEMPOTENCY_CONFLICT",
        details: { idempotency_key: key },
      });
    }
    return record.response;
  }

  save(organizationId: string, key: string, bodyHash: string, response: unknown): void {
    this.records.set(this.key(organizationId, key), {
      organization_id: organizationId,
      body_hash: bodyHash,
      response,
      created_at: new Date().toISOString(),
    });
  }
}

export class InMemoryWebhookStore {
  private readonly byOrganization = new Map<string, WebhookEndpoint[]>();

  create(organizationId: string, projectId: string, input: CreateWebhookInput): WebhookEndpoint {
    const now = new Date().toISOString();
    const secret = randomBytes(32).toString("hex");
    const endpoint: WebhookEndpoint = {
      id: createId("whk"),
      organization_id: organizationId,
      project_id: projectId,
      url: input.url,
      events: [...input.events],
      status: "active",
      description: input.description ?? null,
      secret_prefix: secret.slice(0, 8),
      created_at: now,
      updated_at: now,
    };
    const list = this.byOrganization.get(organizationId) ?? [];
    list.push(endpoint);
    this.byOrganization.set(organizationId, list);
    return endpoint;
  }

  list(organizationId: string): WebhookEndpoint[] {
    return [...(this.byOrganization.get(organizationId) ?? [])];
  }

  private find(organizationId: string, id: string): WebhookEndpoint {
    const endpoint = this.byOrganization
      .get(organizationId)
      ?.find((item) => item.id === id);
    if (endpoint === undefined) {
      throw new UnWhatsError({ code: "RESOURCE_NOT_FOUND", details: { webhook_id: id } });
    }
    return endpoint;
  }

  update(organizationId: string, id: string, patch: Partial<WebhookEndpoint>): WebhookEndpoint {
    const endpoint = this.find(organizationId, id);
    Object.assign(endpoint, patch, { updated_at: new Date().toISOString() });
    return endpoint;
  }

  delete(organizationId: string, id: string): void {
    this.find(organizationId, id);
    const list = this.byOrganization.get(organizationId) ?? [];
    this.byOrganization.set(
      organizationId,
      list.filter((item) => item.id !== id),
    );
  }
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export class InMemoryProjectStore {
  private readonly byOrganization = new Map<string, Project[]>();

  create(organizationId: string, name: string): Project {
    const project: Project = {
      id: createId("prj"),
      organization_id: organizationId,
      name,
      created_at: new Date().toISOString(),
    };
    const list = this.byOrganization.get(organizationId) ?? [];
    list.push(project);
    this.byOrganization.set(organizationId, list);
    return project;
  }

  list(organizationId: string): Project[] {
    return [...(this.byOrganization.get(organizationId) ?? [])];
  }
}

export class InMemoryEventStore {
  private readonly byOrganization = new Map<string, DomainEvent[]>();

  append(event: DomainEvent): void {
    const list = this.byOrganization.get(event.organization_id) ?? [];
    list.push(event);
    this.byOrganization.set(event.organization_id, list);
  }

  list(organizationId: string, type?: string): DomainEvent[] {
    const list = this.byOrganization.get(organizationId) ?? [];
    const filtered = type === undefined ? list : list.filter((event) => event.type === type);
    return [...filtered].reverse();
  }
}

export type CounterName =
  | "api_requests"
  | "messages_accepted"
  | "messages_delivered"
  | "webhook_deliveries";

export class UsageCounters {
  private readonly values = new Map<CounterName, number>();

  increment(name: CounterName, amount = 1): void {
    this.values.set(name, (this.values.get(name) ?? 0) + amount);
  }

  value(name: CounterName): number {
    return this.values.get(name) ?? 0;
  }
}
