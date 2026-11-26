import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { UnWhatsError } from "@unwhats/errors";
import { normalizeProviderStatus, type Capability } from "@unwhats/core";

export const META_SIGNATURE_HEADER = "x-hub-signature-256";
export const META_LEGACY_SIGNATURE_HEADER = "x-hub-signature";

function hmac(algorithm: "sha256" | "sha1", secret: string, payload: string): string {
  return `${algorithm}=${createHmac(algorithm, secret).update(payload).digest("hex")}`;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Meta menandatangani raw body HTTP, bukan payload yang sudah di-parse. */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (signatureHeader === undefined) return false;
  if (signatureHeader.startsWith("sha256=")) {
    return safeEqual(signatureHeader, hmac("sha256", appSecret, rawBody));
  }
  if (signatureHeader.startsWith("sha1=")) {
    return safeEqual(signatureHeader, hmac("sha1", appSecret, rawBody));
  }
  return false;
}

export interface VerifySubscribeInput {
  mode?: string;
  challenge?: string;
  token?: string;
  expectedToken: string;
}

export function verifySubscribeToken(input: VerifySubscribeInput): string {
  if (input.mode !== "subscribe" || input.token !== input.expectedToken) {
    throw new UnWhatsError({
      code: "AUTHORIZATION_ERROR",
      message: "Webhook verification token tidak valid",
    });
  }
  return input.challenge ?? "";
}

const StatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  recipient_id: z.string().optional(),
  errors: z.array(z.unknown()).optional(),
});

const MessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  image: z.object({ caption: z.string().optional() }).optional(),
  video: z.object({ caption: z.string().optional() }).optional(),
  audio: z.object({}).optional(),
  document: z.object({ caption: z.string().optional(), filename: z.string().optional() }).optional(),
  interactive: z.object({}).optional(),
});

const ChangeValueSchema = z.object({
  messaging_product: z.string().optional(),
  metadata: z
    .object({
      display_phone_number: z.string().optional(),
      phone_number_id: z.string(),
    })
    .optional(),
  contacts: z
    .array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() }))
    .optional(),
  messages: z.array(MessageSchema).optional(),
  statuses: z.array(StatusSchema).optional(),
});

export const MetaWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string().optional(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: ChangeValueSchema,
        }),
      ),
    }),
  ),
});

export type NormalizedInboundEvent = {
  kind: "message";
  message_id: string;
  from: string;
  to: string;
  type: "text" | "image" | "video" | "audio" | "document" | "interactive";
  body?: string;
  contact_name?: string;
  timestamp: string;
};

export type NormalizedStatusEvent = {
  kind: "status";
  message_id: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipient_id?: string;
  timestamp: string;
  errors?: unknown[];
};

export type NormalizedWebhookEvent = NormalizedInboundEvent | NormalizedStatusEvent;

const INBOUND_TYPE_MAP: Readonly<Record<string, NormalizedInboundEvent["type"] | undefined>> = {
  text: "text",
  image: "image",
  video: "video",
  audio: "audio",
  document: "document",
  interactive: "interactive",
};

const STATUS_MAP: Readonly<Record<string, NormalizedStatusEvent["status"] | undefined>> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

/** Mengubah payload webhook Meta menjadi event internal UnWhats. */
export function parseMetaWebhook(payload: unknown): NormalizedWebhookEvent[] {
  const parsed = MetaWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    throw new UnWhatsError({
      code: "VALIDATION_ERROR",
      message: "Payload webhook Meta tidak valid",
      details: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  const events: NormalizedWebhookEvent[] = [];
  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const to = value.metadata?.phone_number_id ?? "";

      for (const message of value.messages ?? []) {
        const type = INBOUND_TYPE_MAP[message.type];
        if (type === undefined) continue;
        const contact = value.contacts?.find((item) => item.wa_id === message.from);
        const body = message.text?.body ?? message.image?.caption ?? message.document?.caption ?? undefined;
        events.push({
          kind: "message",
          message_id: message.id,
          from: message.from,
          to,
          type,
          ...(body !== undefined ? { body } : {}),
          ...(contact?.profile?.name !== undefined ? { contact_name: contact.profile.name } : {}),
          timestamp: message.timestamp,
        });
      }

      for (const status of value.statuses ?? []) {
        const mapped = STATUS_MAP[status.status] ?? normalizeProviderStatus(status.status);
        if (mapped === null || mapped === undefined || !(mapped in STATUS_MAP)) continue;
        events.push({
          kind: "status",
          message_id: status.id,
          status: mapped as NormalizedStatusEvent["status"],
          timestamp: status.timestamp,
          ...(status.recipient_id !== undefined ? { recipient_id: status.recipient_id } : {}),
          ...(status.errors !== undefined ? { errors: status.errors } : {}),
        });
      }
    }
  }
  return events;
}

/** Capability yang diperlukan untuk tiap tipe inbound Meta. */
export function capabilityForInbound(type: NormalizedInboundEvent["type"]): Capability {
  return type === "text" ? "text" : type === "interactive" ? "interactive" : "media";
}
