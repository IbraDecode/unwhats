import type { z } from "zod";
import { SendMessageInputSchema } from "@unwhats/contracts";
import type {
  HealthResponseSchema,
  Message,
  PaginationQuery,
  ProviderDescriptor,
  Usage,
  WebhookEndpoint,
  CreateWebhookInput,
  DomainEvent,
} from "@unwhats/contracts";

export type HealthResponseSchemaType = z.infer<typeof HealthResponseSchema>;

/** SDK memakai tipe input Zod: metadata bersifat opsional bagi konsumen. */
export type SendMessageInput = z.input<typeof SendMessageInputSchema>;

export type {
  Message,
  PaginationQuery,
  ProviderDescriptor,
  Usage,
  WebhookEndpoint,
  CreateWebhookInput,
  DomainEvent,
};
