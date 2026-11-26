#!/usr/bin/env node
import { UnWhatsClient } from "@unwhats/sdk-js";
import { UnWhatsError, toUnWhatsError } from "@unwhats/errors";
import { clientConfig, parseArgs } from "./args.js";

const HELP = `UnWhats CLI — Messaging Infrastructure, Reimagined.

Penggunaan:
  unwhats <perintah> [opsi]

Perintah:
  version                    Menampilkan versi CLI
  health                     Memeriksa kesehatan API
  providers list             Melihat daftar provider
  messages send --to <nomor> --body <teks> [--provider <id>]
  webhooks list              Melihat daftar webhook
  doctor                     Memeriksa konfigurasi lokal

Opsi global:
  --api-url <url>            Alamat API (default: $UNWHATS_API_URL)
  --api-key <key>            API key (default: $UNWHATS_API_KEY)
  --help                     Menampilkan bantuan ini
`;

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const command = `${parsed.command} ${parsed.subcommand ?? ""}`.trim();

  if (parsed.flags["help"] === true || command === "help") {
    console.log(HELP);
    return;
  }
  if (command === "version") {
    console.log("unwhats/0.1.0");
    return;
  }
  if (command === "doctor") {
    const config = clientConfig(parsed.flags);
    console.log(
      JSON.stringify(
        {
          api_url: config.baseUrl,
          api_key_tersedia: config.apiKey.length > 0,
          node: process.version,
          status: config.apiKey.length > 0 ? "ok" : "peringatan: API key belum diatur",
        },
        null,
        2,
      ),
    );
    return;
  }

  const config = clientConfig(parsed.flags);
  if (config.apiKey.length === 0) {
    throw new UnWhatsError({
      code: "AUTHENTICATION_ERROR",
      message: "Atur UNWHATS_API_KEY atau gunakan --api-key",
    });
  }
  const client = new UnWhatsClient(config);

  switch (command) {
    case "health":
      console.log(JSON.stringify(await client.health(), null, 2));
      return;
    case "providers list":
      console.log(JSON.stringify(await client.listProviders(), null, 2));
      return;
    case "webhooks list":
      console.log(JSON.stringify(await client.listWebhooks(), null, 2));
      return;
    case "messages send": {
      const to = parsed.flags["to"];
      const body = parsed.flags["body"];
      if (typeof to !== "string" || typeof body !== "string") {
        throw new UnWhatsError({
          code: "VALIDATION_ERROR",
          message: "Gunakan --to <nomor> dan --body <teks>",
        });
      }
      const message = await client.sendMessage({
        provider: typeof parsed.flags["provider"] === "string" ? parsed.flags["provider"] : "meta-cloud",
        to,
        type: "text",
        text: { body },
      });
      console.log(JSON.stringify(message, null, 2));
      return;
    }
    default:
      console.error(`Perintah "${command}" tidak dikenal.\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const wrapped = toUnWhatsError(error);
  console.error(JSON.stringify(wrapped.toPayload(), null, 2));
  process.exitCode = 1;
});
