import { z } from "zod";

/**
 * Konfigurasi adapter Meta Cloud API. Kredensial berasal dari environment
 * dan tidak pernah dikirim ke klien API UnWhats.
 */
export const MetaProviderConfigSchema = z.object({
  access_token: z.string().min(1),
  phone_number_id: z.string().min(1),
  business_account_id: z.string().min(1).optional(),
  api_version: z.string().min(2).default("v23.0"),
  base_url: z.string().url().default("https://graph.facebook.com"),
  webhook_verify_token: z.string().min(8).optional(),
  app_secret: z.string().min(16).optional(),
});

export type MetaProviderConfig = z.infer<typeof MetaProviderConfigSchema>;

export function parseMetaConfig(value: unknown): MetaProviderConfig {
  return MetaProviderConfigSchema.parse(value);
}
