# UnWhats

**Messaging Infrastructure, Reimagined.**

UnWhats adalah ekosistem infrastruktur messaging _developer-first_ dengan API terpadu, arsitektur provider yang ekstensibel, antarmuka automation, dan fondasi produk cloud/enterprise. Proyek independen. Tidak berafiliasi dengan atau didukung oleh Meta atau WhatsApp.

> **Status: M0–M3 selesai.** Repositori berisi kontrak domain, provider SDK, adapter Meta Cloud API resmi, API Gateway, dan infrastruktur lokal. Konektor unofficial tidak tersedia di jalur produksi. Lihat [ROADMAP.md](./ROADMAP.md).

## Prinsip

- **Unified** — satu kontrak API untuk berbagai provider.
- **Extensible** — kapabilitas dideklarasikan eksplisit, bukan diasumsikan identik.
- **Official by default** — konektivitas produksi hanya melalui provider resmi dan terautorisasi.
- **Research is isolated** — Baileys/whatsmeow dipelajari di UnWhats Labs, bukan dipakai sebagai konektor produksi.

## Arsitektur ringkas

```
Klien (SDK · CLI · Dashboard · MCP)
        │
   API Gateway (Fastify · REST /v1)
        │
   Application Core (messages · providers · webhooks · events)
        │
   Provider Abstraction → Meta Cloud API (resmi)
        │
   PostgreSQL · Redis · Queue · OpenTelemetry
```

Modular monolith terlebih dahulu, baru berkembang ke distributed services bila kebutuhan skala nyata muncul. Detail di [ARCHITECTURE.md](./ARCHITECTURE.md) dan [TMD](./docs/TECHNICAL-MASTER-DOCUMENT.md).

## Struktur monorepo

```
apps/          api, cli, dashboard, docs, playground
packages/      core, contracts, provider-sdk, provider-meta*, openapi,
               sdk-js, webhook, event-bus, auth, permissions,
               logger, config, errors, telemetry, testing, mcp
services/      webhook-worker, event-worker, scheduler
infrastructure/ docker, postgres, redis, monitoring
docs/          architecture, decisions, research, api, security
tests/         unit, integration, contract, e2e, performance
```

`*` direncanakan. Arah dependency selalu **adapter → kontrak**, tidak sebaliknya.

## Mulai cepat

```bash
# Prasyarat: Node.js >= 22, pnpm 12, Docker
pnpm install
pnpm check

# Jalankan API + PostgreSQL + Redis
cp .env.example .env
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Contoh penggunaan API:

```bash
curl http://localhost:3000/health

curl -H "Authorization: Bearer uw_test_localdevelopmentkey" \
     http://localhost:3000/v1/providers

curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer uw_test_localdevelopmentkey" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: contoh-001" \
  -d '{"provider":"in-memory","to":"+6281234567890","type":"text","text":{"body":"Halo"}}'
```

> `in-memory` adalah provider deterministik untuk pengembangan. Bukan konektor WhatsApp dan tidak boleh dipakai untuk produksi.

## Paket yang sudah berfungsi

| Paket | Fungsi |
| --- | --- |
| `@unwhats/errors` | Error registry + payload error standar |
| `@unwhats/contracts` | Skema Zod dan tipe domain |
| `@unwhats/core` | ID ULID, state machine status, capability, event |
| `@unwhats/provider-sdk` | Interface provider, lifecycle, registry |
| `@unwhats/provider-meta` | Adapter resmi Meta WhatsApp Cloud API + webhook |
| `@unwhats/webhook` | HMAC-SHA256, header, retry backoff |
| `@unwhats/event-bus` | Event bus dan transactional outbox |
| `@unwhats/config` | Validasi konfigurasi lingkungan |
| `@unwhats/logger` | Structured logging + redaksi secret |
| `@unwhats/openapi` | Spesifikasi OpenAPI 3.1 |
| `@unwhats/sdk-js` | SDK TypeScript/JavaScript |
| `@unwhats/mcp` | Tool registry MCP dengan permission |
| `@unwhats/testing` | Fixture testing bersama |
| `@unwhats/api` | API Gateway Fastify v1 |

## Keputusan penting

Lihat [docs/decisions/](./docs/decisions/) untuk ADR, dan [COMPLIANCE.md](./COMPLIANCE.md) untuk kebijakan provider resmi vs riset.

- Bahasa utama: TypeScript. Bahasa pendukung: Go (SDK).
- Database: PostgreSQL. Cache/queue: Redis + BullMQ.
- API: REST v1 + OpenAPI 3.1. WebSocket direncanakan.
- Lisensi kode baru yang dibuka: Apache-2.0.
- Produk komersial: UnWhats Cloud dan UnWhats Enterprise (repository terpisah).

## Kontribusi

Pull request wajib, CI harus lolos, dan perubahan arsitektur wajib memiliki ADR. Baca [CONTRIBUTING.md](./CONTRIBUTING.md) dan [SECURITY.md](./SECURITY.md).

## Lisensi

Apache-2.0. Lihat [LICENSE](./LICENSE) dan [NOTICE](./NOTICE). Dokumentasi: CC BY 4.0.

---

Dibangun oleh Ibra Ramdan · [github.com/IbraDecode/unwhats](https://github.com/IbraDecode/unwhats)
