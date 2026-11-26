import type { DomainEvent, EventType } from "@unwhats/contracts";
import { createId } from "./ids.js";

export const EVENT_SCHEMA_VERSION = "2026-01-01";

export interface CreateEventInput {
  type: EventType;
  organization_id: string;
  correlation_id: string;
  data: Record<string, unknown>;
}

export function createEvent(input: CreateEventInput): DomainEvent {
  return {
    id: createId("evt"),
    type: input.type,
    version: EVENT_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    correlation_id: input.correlation_id,
    organization_id: input.organization_id,
    data: input.data,
  };
}

export function isMessageEvent(type: EventType): boolean {
  return type.startsWith("message.");
}
