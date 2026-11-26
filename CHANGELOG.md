# Changelog

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/) dan [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — M3 Official Provider

- `@unwhats/provider-meta`: adapter Meta WhatsApp Cloud API (text, template, media, interactive, health).
- Pemetaan error Meta ke error registry UnWhats tanpa membocorkan pesan error mentah.
- Webhook Meta: verifikasi `hub.challenge`, HMAC-SHA256 atas raw body, normalisasi pesan masuk dan status.
- Deduplikasi event webhook dan pelacakan status pesan (`accepted → delivered/read/failed`).
- Endpoint `GET/POST /v1/webhooks/inbound/meta-cloud` dan `GET/POST /v1/templates`.
- Konfigurasi Meta melalui environment; provider aktif hanya bila kredensial lengkap.
- ADR 0009 (transisi status maju saja), ADR 0010, research note UW-RES-007.

### Changed

- State machine status mengizinkan lompatan status maju (Meta dapat mengirim `delivered` langsung setelah `accepted`).
- Model pesan dan OpenAPI memiliki field `interactive`.

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

### Security

- Upgrade Vitest ke 4.1.x dan Zod ke 4.6.x setelah audit menemukan kerentanan pada tinypool, vitest, dan zod. Audit bersih: `No known vulnerabilities found`.
- CI sekarang menggagalkan build bila audit dependency menemukan kerentanan moderate ke atas.

### Notes

- Provider bawaan `in-memory` hanya untuk development dan testing.
- Konektor produksi Meta Cloud API belum diimplementasikan (M3).

[0.1.0]: https://github.com/IbraDecode/unwhats/releases/tag/v0.1.0
