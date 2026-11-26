# UW-RES-001 — Arsitektur Baileys

| Field | Isi |
| --- | --- |
| Subject | WhiskeySockets Baileys |
| Repository | github.com/WhiskeySockets/Baileys |
| Version | v7 release candidates (transisi ESM) |
| License | MIT |
| Research date | 2026-11-26 |
| Compatibility | Klien unofficial WhatsApp Web |

## Arsitektur yang dipelajari

- Socket-based TypeScript client, event-driven.
- Abstraksi auth state dan message.
- Struktur protocol data, media handling, error handling.
- Transisi ke ESM, modernisasi TypeScript, perbaikan memory management.
- Perubahan mutex, app-state synchronization, LID, komponen Rust eksperimental.
- Catatan dependency libsignal dan implikasi lisensinya.

## Temuan

MIT mengizinkan penggunaan/modifikasi dengan atribusi, tetapi **tidak** memberikan izin Meta untuk mengakses platform WhatsApp. Versi v7 membawa breaking changes; dokumentasi migrasi wajib dibaca sebelum evaluasi lanjutan.

## Keputusan UnWhats

Dipakai sebagai referensi teknis dan material audit lisensi. Tidak diintegrasikan sebagai konektor produksi. Lihat ADR 0007.
