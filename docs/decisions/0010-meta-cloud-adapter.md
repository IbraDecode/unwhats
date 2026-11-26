# ADR 0010 — Adapter Meta Cloud API sebagai Provider Produksi

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Produksi harus memakai integrasi resmi dan terautorisasi. Klien unofficial tetap berada di Labs.

## Decision

- Package `@unwhats/provider-meta` mengimplementasikan `MessagingProvider` di atas Graph API.
- Kredensial dibaca dari environment dan tidak pernah dikembalikan lewat API.
- Webhook ingestion memakai raw body + HMAC-SHA256, deduplikasi per event, dan normalisasi ke event UnWhats.
- Meta hanya didaftarkan bila token, phone number ID, app secret, dan verify token tersedia.

## Consequences

Adapter dapat diuji dengan mock fetch tanpa kredensial nyata. Tidak ada ketergantungan pada Baileys/whatsmeow di jalur produksi. Template dan media mengikuti aturan Meta.
