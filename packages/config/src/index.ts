import { z } from "zod";
import { UnWhatsError } from "@unwhats/errors";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).default("postgres://unwhats:unwhats@localhost:5432/unwhats"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  API_KEY_DEV: z.string().min(16).optional(),
  WEBHOOK_SIGNING_SECRET: z.string().min(16).default("dev-only-secret-change-me"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  SERVICE_VERSION: z.string().default("0.1.0"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new UnWhatsError({
      code: "CONFIGURATION_ERROR",
      message: "Konfigurasi lingkungan tidak valid",
      details: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }
  return parsed.data;
}

export function isProduction(config: AppConfig): boolean {
  return config.NODE_ENV === "production";
}
