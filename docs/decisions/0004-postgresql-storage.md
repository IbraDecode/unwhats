# ADR 0004 — PostgreSQL sebagai Primary Storage

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Data messaging bersifat relasional, memerlukan transaksi, tenant isolation, dan audit. Redis cocok untuk cache/queue tetapi bukan source of truth.

## Decision

PostgreSQL sebagai penyimpanan utama dengan Drizzle ORM, migrasi versioned, UUID/ULID, foreign key, index, dan Row-Level Security. Redis + BullMQ untuk cache dan queue.

## Consequences

Konsistensi transaksi kuat. Perlu perhatian pada desain index dan partisi saat volume besar.
