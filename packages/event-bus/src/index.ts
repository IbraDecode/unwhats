import type { DomainEvent, EventType } from "@unwhats/contracts";
import { UnWhatsError } from "@unwhats/errors";

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: EventType | "*", handler: EventHandler): () => void;
  close(): Promise<void>;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<EventType | "*", Set<EventHandler>>();
  private closed = false;

  async publish(event: DomainEvent): Promise<void> {
    if (this.closed) {
      throw new UnWhatsError({ code: "INTERNAL_ERROR", message: "Event bus sudah ditutup" });
    }
    const handlers = [
      ...(this.handlers.get(event.type) ?? []),
      ...(this.handlers.get("*") ?? []),
    ];
    await Promise.all(handlers.map((handler) => handler(event)));
  }

  subscribe(type: EventType | "*", handler: EventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<EventHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => {
      set.delete(handler);
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.handlers.clear();
  }
}

export interface OutboxRecord {
  id: string;
  event: DomainEvent;
  created_at: string;
  published_at: string | null;
  attempts: number;
}

export interface OutboxStore {
  append(event: DomainEvent): Promise<OutboxRecord>;
  pending(limit: number): Promise<OutboxRecord[]>;
  markPublished(id: string): Promise<void>;
  markFailed(id: string): Promise<void>;
}

/**
 * Implementasi in-memory sebagai kontrak untuk implementasi PostgreSQL
 * pada milestone M4. Urutan operasi penting:
 * append() harus dipanggil di dalam transaksi database yang sama dengan
 * perubahan data utama.
 */
export class InMemoryOutbox implements OutboxStore {
  private readonly records: OutboxRecord[] = [];

  async append(event: DomainEvent): Promise<OutboxRecord> {
    const record: OutboxRecord = {
      id: event.id,
      event,
      created_at: new Date().toISOString(),
      published_at: null,
      attempts: 0,
    };
    this.records.push(record);
    return record;
  }

  async pending(limit: number): Promise<OutboxRecord[]> {
    return this.records.filter((record) => record.published_at === null).slice(0, limit);
  }

  async markPublished(id: string): Promise<void> {
    const record = this.records.find((item) => item.id === id);
    if (record !== undefined) record.published_at = new Date().toISOString();
  }

  async markFailed(id: string): Promise<void> {
    const record = this.records.find((item) => item.id === id);
    if (record !== undefined) record.attempts += 1;
  }

  all(): readonly OutboxRecord[] {
    return this.records;
  }
}

export async function drainOutbox(
  outbox: OutboxStore,
  bus: EventBus,
  limit = 100,
): Promise<{ published: number; failed: number }> {
  const pending = await outbox.pending(limit);
  let published = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await bus.publish(record.event);
      await outbox.markPublished(record.id);
      published += 1;
    } catch {
      await outbox.markFailed(record.id);
      failed += 1;
    }
  }

  return { published, failed };
}
