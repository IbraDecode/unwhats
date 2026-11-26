# ADR 0005 — Event-Driven Architecture dengan Transactional Outbox

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Jika data tersimpan tetapi proses mati sebelum event masuk queue, event hilang. Webhook yang hanya HTTP POST gagal memberi jaminan pengiriman.

## Decision

Gunakan transactional outbox: simpan data dan event dalam satu transaksi; worker mempublikasikan event; consumer wajib idempoten. Webhook memakai HMAC, retry eksponensial, DLQ, dan replay diaudit.

## Consequences

Reliability naik. Kompleksitas worker dan deduplikasi bertambah. Contract tests wajib.
