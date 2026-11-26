import type { Message, MessageStatus, MessageType } from "@unwhats/contracts";
import { UnWhatsError } from "@unwhats/errors";
import { createId } from "./ids.js";

/**
 * Status didefinisikan sebagai state machine. Transisi mundur atau melompat
 * dilarang agar dashboard dan event stream tidak pernah inkonsisten.
 */
export const MESSAGE_STATUS_TRANSITIONS: Readonly<Record<MessageStatus, readonly MessageStatus[]>> = {
  queued: ["accepted", "failed"],
  accepted: ["sent", "failed"],
  sent: ["delivered", "failed"],
  delivered: ["read", "failed"],
  read: [],
  failed: [],
};

export const TERMINAL_STATUSES: readonly MessageStatus[] = ["read", "failed"];

/**
 * Provider nyata (termasuk Meta) boleh melompati status perantara:
 * accepted -> delivered langsung adalah hal yang wajar. Aturannya:
 * transisi maju diizinkan, transisi mundur dilarang, failed dapat terjadi
 * dari status non-terminal mana pun.
 */
export const STATUS_RANK: Readonly<Record<MessageStatus, number>> = {
  queued: 0,
  accepted: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 5,
};

export function canTransition(from: MessageStatus, to: MessageStatus): boolean {
  if (from === to) return true;
  if (from === "failed") return false;
  if (to === "failed") return true;
  return STATUS_RANK[to] > STATUS_RANK[from];
}

export function assertTransition(from: MessageStatus, to: MessageStatus): void {
  if (!canTransition(from, to)) {
    throw new UnWhatsError({
      code: "INVALID_MESSAGE",
      message: `Transisi status ${from} -> ${to} tidak diizinkan`,
      details: { from, to },
    });
  }
}

const DEFAULT_STATUS_MAP: Readonly<Record<string, MessageStatus>> = {
  queued: "queued",
  pending: "queued",
  processing: "queued",
  accepted: "accepted",
  sent: "sent",
  sending: "sent",
  delivered: "delivered",
  delivery: "delivered",
  read: "read",
  seen: "read",
  failed: "failed",
  error: "failed",
  rejected: "failed",
  undelivered: "failed",
  expired: "failed",
};

/**
 * Normalisasi status provider. Status asli tetap disimpan oleh caller.
 * Mengembalikan null bila status belum dikenal agar tidak terjadi tebakan.
 */
export function normalizeProviderStatus(
  raw: string,
  customMap: Readonly<Record<string, MessageStatus>> = {},
): MessageStatus | null {
  const key = raw.trim().toLowerCase();
  return customMap[key] ?? DEFAULT_STATUS_MAP[key] ?? null;
}

export interface CreateMessageInput {
  organization_id: string;
  project_id: string;
  provider_id: string;
  direction: Message["direction"];
  type: MessageType;
  to: string;
  from?: string | null;
  text?: Message["text"];
  template?: Message["template"];
  media?: Message["media"];
  interactive?: Message["interactive"];
  metadata?: Message["metadata"];
  status?: MessageStatus;
  provider_message_id?: string | null;
  provider_message_status?: string | null;
}

export function createMessage(input: CreateMessageInput): Message {
  const now = new Date().toISOString();
  return {
    object: "message",
    id: createId("msg"),
    organization_id: input.organization_id,
    project_id: input.project_id,
    provider_id: input.provider_id,
    provider_message_id: input.provider_message_id ?? null,
    provider_message_status: input.provider_message_status ?? null,
    direction: input.direction,
    type: input.type,
    status: input.status ?? "queued",
    to: input.to,
    from: input.from ?? null,
    text: input.text ?? null,
    template: input.template ?? null,
    media: input.media ?? null,
    interactive: input.interactive ?? null,
    metadata: input.metadata ?? {},
    created_at: now,
    updated_at: now,
  };
}

export function transitionMessage(
  message: Message,
  to: MessageStatus,
  rawProviderStatus?: string,
): Message {
  assertTransition(message.status, to);
  return {
    ...message,
    status: to,
    provider_message_status: rawProviderStatus ?? message.provider_message_status,
    updated_at: new Date().toISOString(),
  };
}
