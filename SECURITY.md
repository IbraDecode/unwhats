# Kebijakan Keamanan UnWhats

## Mendukung versi

| Versi | Didukung |
| --- | --- |
| 0.1.x | ✅ |
| < 0.1 | ❌ |

## Melaporkan kerentanan

**Jangan** membuka issue publik untuk kerentanan. Gunakan GitHub Private Vulnerability Reporting pada repositori ini, atau email `security@unwhats.dev` (jika sudah aktif).

Sertakan:

- Deskripsi dan dampak.
- Langkah reproduksi.
- Versi/package yang terdampak.
- Bukti konseptual (jika aman dibagikan).

Kami akan mengakui laporan dalam 3 hari kerja dan memberikan perkiraan perbaikan.

## Prinsip keamanan proyek

- API key dihasilkan secara kriptografis, disimpan sebagai hash, never plaintext.
- RBAC divalidasi di backend, bukan hanya di frontend.
- Tenant isolation wajib pada setiap query data bisnis.
- Webhook memakai HMAC-SHA256 + toleransi waktu terhadap replay.
- Idempotency key mencegah duplikasi operasi.
- Secret tidak pernah dicatat ke log (`@unwhats/logger` melakukan redaksi).
- Dependency dan lisensi dipindai di CI.
- Audit record bersifat immutable.

## Yang bukan kerentanan

- Laporan bahwa Baileys/whatsmeow adalah klien unofficial (sudah diketahui dan menjadi kebijakan riset).
- Ketidakpatuhan pihak ketiga terhadap WhatsApp Messaging Policy (di luar kendali proyek).
- Temuan pada layanan provider resmi Meta — laporkan ke program keamanan Meta.

Lihat [COMPLIANCE.md](./COMPLIANCE.md).
