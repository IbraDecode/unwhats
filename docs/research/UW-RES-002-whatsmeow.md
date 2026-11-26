# UW-RES-002 — Arsitektur whatsmeow

| Field | Isi |
| --- | --- |
| Subject | tulir/whatsmeow |
| Repository | github.com/tulir/whatsmeow |
| Version | commit yang diaudit pada 2026-11-26 |
| License | MPL-2.0 |
| Compatibility | Klien unofficial WhatsApp Web (Go) |

## Arsitektur yang dipelajari

- Concurrency Go dan socket lifecycle.
- Event processing, protocol abstraction, storage layer.
- Cryptographic state management dan message synchronization.
- Mendukung private/group messaging, media, receipts, group management, app-state sync.

## Keterbatasan

Broadcast list messaging dan calls tidak diimplementasikan pada dokumentasi yang diperiksa.

## Implikasi lisensi

MPL-2.0 memiliki kewajiban source disclosure untuk file tercakup bila didistribusikan termodifikasi. Jangan mencampur file MPL ke produk proprietary.

## Keputusan UnWhats

ReferensiGo untuk pola konkurensi dan state. Tidak dipakai sebagai konektor produksi. Lihat ADR 0007.
