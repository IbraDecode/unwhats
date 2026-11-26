# Changelog

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/) dan [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-11-26

### Added

- Fondasi monorepo: pnpm workspace, Turborepo, TypeScript strict, ESLint, Prettier, Vitest.
- `@unwhats/errors`: error registry 16 kode, payload error standar, mapped HTTP status dan retryability.
- `@unwhats/contracts`: skema Zod untuk message, provider, capability, event, webhook, usage, pagination.
- `@unwhats/core`: ULID, state machine status pesan, capability registry, event factory.
- `@unwhats/provider-sdk`: interface provider, lifecycle state machine, provider registry, in-memory provider.
- `@unwhats/webhook`: HMAC-SHA256 sign/verify, header builder, retry backoff 7 attempt.
- `@unwhats/event-bus`: in-memory event bus dan transactional outbox.
- `@unwhats/config`, `@unwhats/logger`, `@unwhats/openapi` (OpenAPI 3.1), `@unwhats/testing`.
- `@unwhats/sdk-js` dan `@unwhats/mcp` (tool registry + permission + approval).
- `@unwhats/api`: Fastify v1, API key auth, scope, tenant isolation, idempotensi, event, webhook test, usage.
- `@unwhats/cli`: perintah `version`, `health`, `providers list`, `messages send`, `webhooks list`, `doctor`.
- Docker Compose development (API + PostgreSQL + Redis), Dockerfile multi-stage.
- ADR 0001–0008, research note UW-RES-001–006, TMD, governance docs, CI workflow.

### Notes

- Provider bawaan `in-memory` hanya untuk development dan testing.
- Konektor produksi Meta Cloud API belum diimplementasikan (M3).

[0.1.0]: https://github.com/IbraDecode/unwhats/releases/tag/v0.1.0
