# UW-RES-005 — Audit Lisensi Dependency

| Field | Isi |
| --- | --- |
| Subject | Lisensi proyek referensi dan dependency |
| Research date | 2026-11-26 |

## Ringkasan awal

| Proyek | Lisensi | Catatan |
| --- | --- | --- |
| Baileys | MIT | Atribusi wajib; bukan izin platform |
| whatsmeow | MPL-2.0 | Source disclosure untuk file tercakup |
| WAHA | Lihat repo resmi | Perlu verifikasi versi |
| Evolution API | Apache-2.0 + ketentuan tambahan | Aktivasi lisensi dan perlindungan merek |
| open-wa | Hippocratic + Do No Harm 1.1 | Lisensi non-standar |
| whatsapp-web.js, WPPConnect | Lihat repo resmi | Perlu verifikasi |

## Tindakan

- Apache-2.0 untuk kode baru yang dibuka; CC BY 4.0 untuk dokumentasi.
- NOTICE mencatat dependency dan referensi.
- Audit otomatis di CI sebelum rilis publik.
- Tidak ada kode referensi yang disalin ke repositori ini.

## Status

Audit awal selesai. Audit mendalam berkelanjutan sebelum peluncuran komersial. Lihat ADR 0006.
