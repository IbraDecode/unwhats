# UnWhats — Technical Master Document (TMD)

Versi: 1.0 · Tanggal: 26 November 2026 · Status: sumber kebenaran teknis proyek.

Dokumen ini mengintegrasikan PRD, SRS, SAD, desain database, spesifikasi API, provider SDK, event, keamanan, infrastruktur, tata kelola open-source, produk private, testing, deployment, runbook, dan roadmap. Dokumen modul yang lebih rinci berada di `docs/` dan `packages/`.

---

## 1. Product Requirements (PRD)

### 1.1 Identitas

- Nama: **UnWhats**
- Kategori: Messaging Infrastructure Platform
- Tagline: *Messaging Infrastructure, Reimagined.*
- Posisi: developer-first, extensible, dengan fondasi open-source dan produk cloud/enterprise.
- Independent software project. Tidak berafiliasi dengan Meta/WhatsApp.

### 1.2 Filosofi nama

`Un` = Unified, universal, extensible. `Whats` = terinspirasi ekosistem komunikasi WhatsApp. Ini branding, bukan klaim produk resmi. Pemeriksaan merek dagang dan domain belum diselesaikan.

### 1.3 Masalah yang dipecahkan

- API wrapper Baileys tidak diferensiasi; Evolution API dan WAHA sudah menyediakan multi-engine.
- Tidak ada standar capability, error, status, dan event yang konsisten lintas provider.
- Webhook kehilangan event karena tidak ada transactional outbox.
- Developer experience (SDK, CLI, playground, dokumentasi) sering menjadi afterthought.

### 1.4 Tujuan produk

1. API terpadu dengan kontrak versi (`/v1`).
2. Provider abstraction dengan capability registry eksplisit.
3. Event infrastructure yang andal.
4. SDK resmi TypeScript/JavaScript dan Go.
5. Dashboard dan developer portal.
6. MCP/AI integration dengan permission dan approval.
7. Produk Cloud dan Enterprise terpisah dari fondasi open-source.

### 1.5 Non-tujuan

- Bukan klien unofficial WhatsApp untuk produksi.
- Bukan fork Baileys/whatsmeow.
- Bukan satu repository besar tanpa batas modul.
- Tidak klaim kinerja sebelum benchmark yang dapat direproduksi.

---

## 2. System Requirements (SRS)

### 2.1 Fungsional

| ID | Requirement |
| --- | --- |
| FR-01 | Sistem harus menyediakan REST API versi 1 dengan envelope respons konsisten. |
| FR-02 | Sistem harus mengautentikasi setiap request programatik dengan API key. |
| FR-03 | Sistem harus memisahkan scope `messages:read`, `messages:write`, `providers:read`, `webhooks:read`, `webhooks:write`, `usage:read`. |
| FR-04 | Sistem harus mengisolasi data antar organisasi. |
| FR-05 | Sistem harus menolak capability yang tidak dideklarasikan provider dengan `UNSUPPORTED_CAPABILITY`. |
| FR-06 | Sistem harus membedakan status `queued`, `accepted`, `sent`, `delivered`, `read`, `failed`. |
| FR-07 | Sistem harus mendukung idempotency key per organisasi. |
| FR-08 | Sistem harus menyimpan event ke outbox dalam transaksi yang sama dengan perubahan data. |
| FR-09 | Sistem harus menandatangani webhook dengan HMAC-SHA256. |
| FR-10 | Webhook harus memiliki retry, dead-letter queue, dan replay yang diaudit. |
| FR-11 | MCP harus memakai API publik, bukan database internal. |
| FR-12 | Aksi pengiriman via MCP wajib mendapat persetujuan eksplisit. |

### 2.2 Non-fungsional

| ID | Requirement |
| --- | --- |
| NFR-01 | TypeScript strict, tidak ada `any` pada kode publik. |
| NFR-02 | Semua error API mengikuti error registry. |
| NFR-03 | Credential tidak pernah dicatat dalam log. |
| NFR-04 | Semua migrasi database versioned dan dapat diuji. |
| NFR-05 | CI wajib menjalankan lint, typecheck, unit, integration, contract, security, license. |
| NFR-06 | Startup dan shutdown aplikasi harus bersih. |
| NFR-07 | Deployment development reproduksibel dengan Docker Compose. |
| NFR-08 | Observability memakai OpenTelemetry, Prometheus, Grafana. |

---

## 3. System Architecture (SAD)

### 3.1 Gaya arsitektur

Modular monolith → distributed services bertahap. Boundary domain: identity, project, provider, messaging, webhook, usage, audit.

### 3.2 Komponen

```
UNWHATS CLIENTS
  Dashboard · SDK · CLI · External Apps · MCP Clients
        │
API GATEWAY
  REST /v1 · API Keys · Auth · Scope · Rate Limit · Request ID
        │
APPLICATION CORE
  Organization · Project · Message · Webhook · Template · Usage · Policy · Event Router
        │
PROVIDER ABSTRACTION
  provider-sdk → provider-meta (resmi) → Labs (riset, non-produksi)
        │
INFRASTRUCTURE
  PostgreSQL · Redis · BullMQ · Object Storage · Secrets · OpenTelemetry
```

### 3.3 Arah dependency

`adapter → provider-sdk → core → contracts → errors`. `core` dilarang mengimpor adapter. MCP adalah adapter di atas SDK client.

### 3.4 Control plane vs data plane

Lihat `ARCHITECTURE.md`. Pemisahan fisik direncanakan pada M9.

---

## 4. Architecture Decision Records

Ringkasan; detail di `docs/decisions/`.

| ADR | Keputusan |
| --- | --- |
| 0001 | Modular monolith terlebih dahulu |
| 0002 | Provider abstraction dengan capability registry |
| 0003 | TypeScript sebagai bahasa utama, Go sebagai pendukung |
| 0004 | PostgreSQL sebagai primary store |
| 0005 | Event-driven architecture dengan transactional outbox |
| 0006 | Open source + private products terpisah |
| 0007 | Hanya provider resmi untuk produksi |
| 0008 | snake_case sebagai format field API & domain |
| 0009 | Transisi status maju saja (provider boleh melompat status) |
| 0010 | Adapter Meta Cloud API sebagai provider produksi |

---

## 5. Database Design

Primary: PostgreSQL. Redis hanya untuk cache/queue, bukan penyimpanan data bisnis utama.

Domain: identity (`users`, `organizations`, `memberships`, `roles`), project (`projects`, `environments`, `api_keys`), provider (`providers`, `provider_accounts`, `capabilities`), messaging (`messages`, `message_events`, `templates`), webhook (`webhook_endpoints`, `deliveries`, `attempts`), billing (`plans`, `subscriptions`, `usage_records`, `invoices`), security (`audit_logs`, `security_events`, `access_policies`, `idempotency_records`), infrastructure (`deployments`, `health_checks`, `incidents`).

Aturan:

1. Setiap tabel tenant memiliki `organization_id`.
2. Row-Level Security sebagai lapisan kedua.
3. Foreign key validasi tenant.
4. UUID/ULID sesuai kebutuhan.
5. Event dapat ditelusuri via `correlation_id`.
6. Retention untuk pesan dan audit log.
7. Index berdasarkan query nyata.
8. Migration versioned.

Fondasi SQL: `infrastructure/postgres/init.sql`. Implementasi penuh: M4 (Drizzle).

---

## 6. API Specification

Sumber kebenaran: `packages/openapi/src/spec.ts` (OpenAPI 3.1). Base URL: `https://api.unwhats.dev/v1`.

Envelope sukses:

```json
{ "data": {}, "meta": { "request_id": "req_01JXYZ" } }
```

Envelope error:

```json
{
  "error": {
    "code": "UNSUPPORTED_CAPABILITY",
    "message": "The provider does not support this capability.",
    "request_id": "req_01JXYZ",
    "retryable": false,
    "documentation_url": "https://docs.unwhats.dev/errors"
  }
}
```

Endpoint utama: `/health`, `/ready`, `/v1/projects`, `/v1/providers`, `/v1/providers/:id`, `/v1/providers/:id/capabilities`, `/v1/messages`, `/v1/messages/:id`, `/v1/webhooks`, `/v1/webhooks/:id`, `/v1/webhooks/:id/test`, `/v1/usage`, `/v1/events`, `/v1/templates`.

Pagination: cursor-based (`limit`, `starting_after`, `ending_before`). Breaking changes → `/v2`.

Contoh pengiriman:

```http
POST /v1/messages
Authorization: Bearer uw_live_xxx
Idempotency-Key: order-2026-0001
Content-Type: application/json

{
  "provider": "meta-cloud",
  "to": "+6281234567890",
  "type": "text",
  "text": { "body": "Halo" }
}
```

Status `accepted` tidak sama dengan `delivered` atau `read`.

---

## 7. Provider SDK Specification

Interface: identity, version, initialize, getCapabilities, sendMessage, getMessage, healthCheck, shutdown, optional lifecycle/descriptor.

Lifecycle: `registered → configured → initializing → ready → degraded/failed → stopping → stopped`.

Capability: `text`, `media`, `templates`, `interactive`, `inbound_messages`, `delivery_receipts`, `read_receipts`, `groups`, `calling`.

Error mapping: `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT`, `RATE_LIMITED`, `UNSUPPORTED_CAPABILITY`, `INVALID_MESSAGE`, `MEDIA_PROCESSING_FAILED`, `DELIVERY_FAILED`, `WEBHOOK_FAILED`, `RESOURCE_NOT_FOUND`, `IDEMPOTENCY_CONFLICT`, `INTERNAL_ERROR`, `VALIDATION_ERROR`, `CONFIGURATION_ERROR`, `TENANT_ISOLATION_VIOLATION`.

Implementasi awal: `InMemoryProvider` untuk development/testing. Adapter produksi: `@unwhats/provider-meta` (M3) untuk Meta WhatsApp Cloud API — text, template, media, interactive, health, webhook verification, inbound messages, dan status tracking. Error Meta dipetakan ke error registry tanpa membocorkan pesan mentah. Lihat ADR 0010 dan UW-RES-007.

---

## 8. Event Specification

Tipe: `message.queued|accepted|sent|delivered|read|failed|received`, `provider.connected|disconnected|error`, `webhook.delivered|failed`.

Struktur: `id`, `type`, `version`, `created_at`, `correlation_id`, `organization_id`, `data`.

Pipeline: provider event → ingestion → normalisasi → transactional outbox → queue → internal consumers + external webhooks.

Header webhook: `X-UnWhats-Event`, `X-UnWhats-Delivery`, `X-UnWhats-Timestamp`, `X-UnWhats-Signature: sha256=...`.

Retry: 0s, 5s, 30s, 2m, 10m, 30m, 2h → DLQ → replay diaudit.

---

## 9. Security Architecture

- Auth: API key (hash SHA-256, prefix, scope, rotasi, revokasi) + OAuth/OIDC (rencana).
- Authorization: RBAC + resource scope, divalidasi backend.
- Secrets: KMS/secret manager (rencana), tidak plaintext.
- Encryption: TLS + encryption at rest.
- Tenant isolation: filter aplikasi + PostgreSQL RLS.
- Audit: immutable record.
- Webhook: HMAC + constant-time verify + toleransi replay.
- Idempotency, rate limiting (rencana), consent/policy checks.
- Observability: OpenTelemetry.

---

## 10. Infrastructure Design

Development: Docker Compose (API, PostgreSQL, Redis). Staging: DB terpisah, secret terisolasi, rollback. Production: container orchestration, managed PostgreSQL, queue workers, object storage, logging/tracing terpusat, backup & DR. Kubernetes hanya bila workload membenarkan.

CI/CD: push → lint/typecheck → unit → integration → security/license → build artifact → container → staging → smoke test → approval → production. Release: GitHub Releases, SBOM, provenance, signed artifact.

---

## 11. Open Source Governance

Repositories publik direncanakan: `unwhats`, `sdk-js`, `sdk-go`, `cli`, `openapi`, `provider-meta`, `mcp`, `webhooks`, `docs`, `examples`, `docker`, `community`. Pendekatan awal: hybrid monorepo → multi-repo saat stabil. Lisensi Apache-2.0 untuk kode baru, CC BY 4.0 untuk docs. Perubahan wajib PR + CI + review + changeset.

---

## 12. Private Product Specification

- **UnWhats Cloud**: hosted API, DB, webhook, monitoring, usage dashboard, billing.
- **UnWhats Enterprise**: dedicated deployment, SSO, advanced RBAC, audit retention, SLA.
- Control plane, billing, cloud-infra, labs-internal, security-ops pada repository private.
- Plan tidak boleh membatasi hak yang sudah diberikan lisensi open-source.

---

## 13. Testing Strategy

Pyramid: unit → contract → integration → e2e → performance.

Matrix: validasi request, auth invalid/expired, cross-tenant access, capability contract, status transition, webhook retry & signature, queue duplicate/failed, migration & transaction, secret leakage, SDK type safety, MCP permission, startup/shutdown, latency & throughput.

Quality gate: build, typecheck, unit, integration, contract, security scan, license scan, migration test, Docker verify, docs, changelog, signed artifact.

---

## 14. Deployment & Runbook (ringkas)

- Development: `docker compose -f infrastructure/docker/docker-compose.yml up --build`.
- Rollback: gunakan image tag sebelumnya dan migrasi database yang reversible.
- Insiden: prioritaskan penghentian webhook retry yang bermasalah, periksa outbox pending, dead-letter queue, dan correlation ID.
- Backup: PostgreSQL PITR; verifikasi restore berkala.

---

## 15. Roadmap & Definition of Done

Lihat `ROADMAP.md`. Milestone selesai bukan hanya karena kode berjalan: harus lulus test, security review, dokumentasi, release notes, versioning, dan deployment verification.

---

## 16. Status saat ini

M0, M1, M2, dan M3 selesai. M6 dan M8 memiliki dasar (SDK JS, CLI, MCP tool registry). Fitur lainnya mengikuti roadmap.
