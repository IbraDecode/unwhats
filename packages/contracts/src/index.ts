import { z } from "zod";

/** Semua ID UnWhats memakai pola <prefix>_<ULID Crockford>. */
export const IdSchema = z
  .string()
  .regex(/^[a-z]+_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$/, "Format ID tidak valid");

export const MessageDirectionSchema = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;

export const MessageTypeSchema = z.enum([
  "text",
  "image",
  "video",
  "audio",
  "document",
  "template",
  "interactive",
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * Status ternormalisasi UnWhats. Status asli provider disimpan terpisah
 * pada provider_message_status agar tidak ada informasi yang hilang.
 */
export const MessageStatusSchema = z.enum([
  "queued",
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

export const ProviderLifecycleSchema = z.enum([
  "registered",
  "configured",
  "initializing",
  "ready",
  "degraded",
  "failed",
  "stopping",
  "stopped",
]);
export type ProviderLifecycle = z.infer<typeof ProviderLifecycleSchema>;

export const TextContentSchema = z.object({
  body: z.string().min(1).max(4096),
  preview_url: z.boolean().optional(),
});

export const TemplateContentSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(2).default("id"),
  components: z.array(z.unknown()).default([]),
});

export const MediaContentSchema = z.object({
  url: z.string().url().optional(),
  media_id: z.string().optional(),
  caption: z.string().max(4096).optional(),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
});

export const InteractiveContentSchema = z.object({
  type: z.enum(["button", "list", "cta_url"]),
  body: z.object({ text: z.string() }).optional(),
  action: z.record(z.string(), z.unknown()),
  footer: z.object({ text: z.string() }).optional(),
  header: z.object({ type: z.string(), text: z.string() }).optional(),
});

export const MetadataSchema = z.record(z.string(), z.unknown());

export const MessageSchema = z.object({
  object: z.literal("message"),
  id: IdSchema,
  organization_id: IdSchema,
  project_id: IdSchema,
  provider_id: z.string().min(1),
  provider_message_id: z.string().nullable(),
  provider_message_status: z.string().nullable(),
  direction: MessageDirectionSchema,
  type: MessageTypeSchema,
  status: MessageStatusSchema,
  to: z.string().min(1),
  from: z.string().nullable(),
  text: TextContentSchema.nullable(),
  template: TemplateContentSchema.nullable(),
  media: MediaContentSchema.nullable(),
  interactive: InteractiveContentSchema.nullable(),
  metadata: MetadataSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const SendMessageInputSchema = z
  .object({
    provider: z.string().min(1),
    to: z.string().min(1),
    type: MessageTypeSchema,
    text: TextContentSchema.optional(),
    template: TemplateContentSchema.optional(),
    media: MediaContentSchema.optional(),
    interactive: InteractiveContentSchema.optional(),
    metadata: MetadataSchema.default({}),
  })
  .refine((value) => value.type !== "text" || value.text !== undefined, {
    message: "Pesan teks memerlukan field text.body",
    path: ["text"],
  })
  .refine((value) => value.type !== "template" || value.template !== undefined, {
    message: "Pesan template memerlukan field template",
    path: ["template"],
  });
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const SendMessageResultSchema = z.object({
  message: MessageSchema,
  provider_message_id: z.string().nullable(),
});
export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;

export const ProviderCapabilitiesSchema = z.object({
  version: z.string().default("1"),
  text: z.boolean(),
  media: z.boolean(),
  templates: z.boolean(),
  interactive: z.boolean(),
  inbound_messages: z.boolean(),
  delivery_receipts: z.boolean(),
  read_receipts: z.boolean(),
  groups: z.boolean(),
  calling: z.boolean(),
});
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

export const ProviderHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  latency_ms: z.number().nonnegative(),
  checked_at: z.string().datetime(),
  details: MetadataSchema.default({}),
});
export type ProviderHealth = z.infer<typeof ProviderHealthSchema>;

export const ProviderDescriptorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string(),
  lifecycle: ProviderLifecycleSchema,
  capabilities: ProviderCapabilitiesSchema,
  production_ready: z.boolean(),
});
export type ProviderDescriptor = z.infer<typeof ProviderDescriptorSchema>;

export const EVENT_TYPES = [
  "message.queued",
  "message.accepted",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "message.received",
  "provider.connected",
  "provider.disconnected",
  "provider.error",
  "webhook.delivered",
  "webhook.failed",
] as const;

export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventSchema = z.object({
  id: IdSchema,
  type: EventTypeSchema,
  version: z.string().default("2026-01-01"),
  created_at: z.string().datetime(),
  correlation_id: z.string(),
  organization_id: IdSchema,
  data: MetadataSchema,
});
export type DomainEvent = z.infer<typeof EventSchema>;

export const WebhookStatusSchema = z.enum(["active", "paused", "failed"]);

export const WebhookEndpointSchema = z.object({
  id: IdSchema,
  organization_id: IdSchema,
  project_id: IdSchema,
  url: z.string().url(),
  events: z.array(EventTypeSchema),
  status: WebhookStatusSchema,
  description: z.string().nullable(),
  secret_prefix: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

export const CreateWebhookInputSchema = z.object({
  url: z.string().url(),
  events: z.array(EventTypeSchema).min(1),
  description: z.string().max(500).optional(),
});
export type CreateWebhookInput = z.infer<typeof CreateWebhookInputSchema>;

export const UpdateWebhookInputSchema = CreateWebhookInputSchema.partial().extend({
  status: WebhookStatusSchema.optional(),
});
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookInputSchema>;

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function cursorPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
  });
}

export const SuccessEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: z.object({ request_id: z.string() }),
  });

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
    retryable: z.boolean(),
    provider_code: z.string().optional(),
    documentation_url: z.string(),
    details: MetadataSchema.optional(),
  }),
});

export const API_KEY_SCOPES = [
  "messages:read",
  "messages:write",
  "providers:read",
  "webhooks:read",
  "webhooks:write",
  "usage:read",
] as const;

export const ApiKeyScopeSchema = z.enum(API_KEY_SCOPES);
export type ApiKeyScope = z.infer<typeof ApiKeyScopeSchema>;

export const AuthenticatedPrincipalSchema = z.object({
  type: z.enum(["api_key", "user", "service_account"]),
  id: IdSchema,
  organization_id: IdSchema,
  project_id: IdSchema.nullable(),
  scopes: z.array(ApiKeyScopeSchema),
});
export type AuthenticatedPrincipal = z.infer<typeof AuthenticatedPrincipalSchema>;

export const UsageSchema = z.object({
  object: z.literal("usage"),
  organization_id: IdSchema,
  period: z.object({ start: z.string().datetime(), end: z.string().datetime() }),
  api_requests: z.number().int().nonnegative(),
  messages_accepted: z.number().int().nonnegative(),
  messages_delivered: z.number().int().nonnegative(),
  webhook_deliveries: z.number().int().nonnegative(),
});
export type Usage = z.infer<typeof UsageSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  version: z.string(),
  uptime_seconds: z.number().nonnegative(),
  checked_at: z.string().datetime(),
});

export const ReadyResponseSchema = z.object({
  ready: z.boolean(),
  checks: z.record(z.string(), z.boolean()),
});
