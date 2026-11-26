# UW-RES-004 — Provider Abstraction

| Field | Isi |
| --- | --- |
| Subject | Desain kontrak provider UnWhats |
| Research date | 2026-11-26 |

## Context

Evolution API sudah mendukung Baileys dan WhatsApp Cloud API; WAHA multi-engine. Membungkus satu engine menjadi REST API bukan diferensiasi.

## Keputusan

- `MessagingProvider`: identity, version, initialize, capabilities, sendMessage, getMessage, healthCheck, shutdown.
- Lifecycle state machine: registered → configured → initializing → ready → degraded/failed → stopping → stopped.
- Capability registry eksplisit; error `UNSUPPORTED_CAPABILITY`.
- Status asli provider disimpan terpisah dari status ternormalisasi UnWhats.

## Status implementasi

Diterapkan di `packages/provider-sdk` dan `packages/contracts`. Lihat ADR 0002.
