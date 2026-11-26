# ADR 0002 — Provider Abstraction dan Capability Registry

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Baileys, whatsmeow, dan engine WAHA memiliki kemampuan berbeda. Menyamakan semua provider secara diam-diam menghasilkan SDK yang menyesatkan.

## Decision

Setiap provider wajib mendeklarasikan identity, version, capabilities, configuration schema, lifecycle, health, dan error mapping. Fitur yang tidak didukung menghasilkan `UNSUPPORTED_CAPABILITY`.

## Consequences

Konsumen dapat memeriksa kapabilitas sebelum mengirim. Adapter baru dapat ditambahkan tanpa mengubah core. Biaya: lebih banyak metadata yang harus dikelola.
