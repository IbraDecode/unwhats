# Arsitektur UnWhats

## Ringkasan

UnWhats adalah **modular monolith** yang secara sengaja tidak langsung menjadi microservices. Domain dibatasi jelas sejak hari pertama agar pemisahan layanan dimungkinkan kemudian tanpa menulis ulang kontrak.

## Control Plane vs Data Plane

| Control Plane | Data Plane |
| --- | --- |
| Organization, user, API key | Request API |
| Project, environment | Orkestrasi pesan |
| Provider configuration | Panggilan provider |
| Billing, quota, entitlement | Webhook event |
| Deployment management | Queue dan status pengiriman |

Keduanya akan dipisahkan secara fisik pada UnWhats Cloud (M9).

## Alur pesan keluar

1. Request masuk → API Gateway (Fastify).
2. Autentikasi API key (hash SHA-256, prefix, scope).
3. Validasi Zod → `SendMessageInput`.
4. Idempotency check terhadap `organization_id + Idempotency-Key`.
5. Provider registry → verifikasi provider dan kapabilitas.
6. Provider adapter mengirim ke provider **resmi**.
7. Simpan pesan + tulis event ke **transactional outbox** dalam satu transaksi.
8. Worker mempublikasikan event ke queue → consumer internal + webhook eksternal.
9. Status `accepted` **tidak** sama dengan `delivered`/`read`.

## Alur event

```
Provider event → ingestion → validasi & normalisasi
              → transactional outbox → queue
              → internal consumers
              → external webhooks (HMAC, retry, DLQ)
```

## Batas dependency

```
contracts  ←  core  ←  provider-sdk  ←  provider-meta (rencana)
     ↑            ↑            ↑
   errors      errors       errors

apps/api → semua package di atas
sdk-js   → contracts + errors
mcp      → sdk-js + contracts + errors (TIDAK mengakses DB)
```

**Aturan keras:** `core` tidak boleh mengimpor `provider-meta` atau adapter lain.

## Multi-tenancy

- Setiap tabel data bisnis memiliki `organization_id`.
- aplikasi memfilter berdasarkan principal; PostgreSQL RLS menjadi lapisan kedua.
- Foreign key memvalidasi relasi tenant, bukan sekadar ID.
- Semua respons error menyertakan `request_id` untuk telusur.

## Status implementasi

| Komponen | Status |
| --- | --- |
| Error registry, contracts, core | ✅ M1 |
| Provider SDK + lifecycle | ✅ M1 |
| API Gateway + auth + idempotensi | ✅ M2 |
| OpenAPI 3.1 | ✅ M2 |
| SDK JS + MCP adapter | ✅ dasar M6 |
| Webhook signature + outbox | ✅ kontrak M5 |
| PostgreSQL migration penuh | ⏳ M4 |
| BullMQ worker + DLQ | ⏳ M5 |
| Meta Cloud API adapter | ⏳ M3 |
| Dashboard, Cloud, Enterprise | ⏳ M7–M10 |

Lihat detail di [docs/architecture/](./docs/architecture/) dan [TMD](./docs/TECHNICAL-MASTER-DOCUMENT.md).
