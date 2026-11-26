# Kebijakan Kepatuhan Provider

Dokumen ini menetapkan batas antara produk produksi dan riset.

## UnWhats Official (Production)

Konektivitas produksi hanya melalui:

- Meta WhatsApp Cloud API;
- provider resmi lain yang terautorisasi;
- adapter dengan kontrak provider yang tervalidasi.

Kewajiban produksi:

- opt-in penerima pesan;
- template message sesuai aturan provider;
- customer service window bila berlaku;
- pencatatan usage dan biaya secara transparan;
- perlindungan data dan perjanjian pemrosesan data bila menjadi penyedia layanan.

## UnWhats Labs (Research)

Riset diperbolehkan untuk:

- analisis arsitektur Baileys dan whatsmeow;
- kompatibilitas protokol dan studi TypeScript/Go;
- audit dependency dan lisensi;
- benchmark dengan kondisi pengujian yang setara.

**Dilarang** mengaktifkan koneksi unofficial ke WhatsApp dalam layanan komersial tanpa izin tertulis yang diperlukan. Hasil riset tidak otomatis menjadi fitur produksi.

## Referensi kebijakan

- WhatsApp Messaging Guidelines (diperbarui 23 September 2026).
- WhatsApp Business App Terms (efektif 23 September 2026).
- WhatsApp Business Messaging Policy.
- Dokumentasi Meta WhatsApp Business Platform.

## Audit lisensi

| Proyek | Lisensi | Implikasi |
| --- | --- | --- |
| Baileys | MIT | Boleh dipelajari/dimodifikasi dengan atribusi; bukan izin platform Meta |
| whatsmeow | MPL-2.0 | Kewajiban source disclosure untuk file tercakup bila didistribusikan termodifikasi |
| Evolution API | Apache-2.0 + ketentuan tambahan | Perhatikan ketentuan merek dan aktivasi lisensi |
| open-wa | Hippocratic + Do No Harm 1.1 | Lisensi non-standar; audit sebelum penggunaan |

Evaluasi versi dan commit harus dicatat di `docs/research/`.
