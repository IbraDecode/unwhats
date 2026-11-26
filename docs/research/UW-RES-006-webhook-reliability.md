# UW-RES-006 — Webhook Reliability

| Field | Isi |
| --- | --- |
| Subject | Pola pengiriman webhook yang andal |
| Research date | 2026-11-26 |

## Masalah

HTTP POST langsung setelah menerima pesan berisiko kehilangan event bila proses mati antara penyimpanan data dan publishing.

## Desain

1. Simpan data utama + event outbox dalam satu transaksi database.
2. Worker mengambil event pending dan mempublikasikan ke queue.
3. Tandai published hanya setelah berhasil.
4. Webhook: ID unik, schema version, timestamp, HMAC-SHA256, delivery ID, retry counter.
5. Retry: 0s, 5s, 30s, 2m, 10m, 30m, 2h → DLQ.
6. Consumer wajib idempoten; replay dibatasi dan diaudit.

## Status implementasi

Kontrak di `packages/webhook` dan `packages/event-bus`. Worker BullMQ dan DLQ: M5. Lihat ADR 0005.
