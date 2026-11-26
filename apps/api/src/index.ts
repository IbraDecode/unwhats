import { loadConfig } from "@unwhats/config";
import { InMemoryEventBus, InMemoryOutbox } from "@unwhats/event-bus";
import { createLogger } from "@unwhats/logger";
import { InMemoryProvider, ProviderRegistry } from "@unwhats/provider-sdk";
import { ALL_SCOPES, InMemoryApiKeyStore, generateApiKey } from "./auth.js";
import { buildApp, createStores } from "./app.js";
import { DEV_ORGANIZATION_ID, DEV_PROJECT_ID } from "./constants.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ name: "unwhats-api", level: config.LOG_LEVEL });

  const providers = new ProviderRegistry();
  providers.register(new InMemoryProvider());

  const apiKeys = new InMemoryApiKeyStore();
  const rawKey = config.API_KEY_DEV ?? generateApiKey("test");
  apiKeys.add({
    organization_id: DEV_ORGANIZATION_ID,
    project_id: DEV_PROJECT_ID,
    scopes: [...ALL_SCOPES],
    rawKey,
  });

  if (config.API_KEY_DEV === undefined) {
    logger.warn("API key development dibuat otomatis", { api_key: rawKey });
  }

  const app = await buildApp({
    config,
    providers,
    apiKeys,
    stores: createStores(),
    eventBus: new InMemoryEventBus(),
    outbox: new InMemoryOutbox(),
    logger,
  });

  await app.listen({ host: config.HOST, port: config.PORT });
  logger.info("UnWhats API siap", { host: config.HOST, port: config.PORT });

  const shutdown = async (): Promise<void> => {
    logger.info("Mematikan UnWhats API");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
