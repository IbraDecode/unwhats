# UW-RES-007 — Meta WhatsApp Cloud API

| Field | Isi |
| --- | --- |
| Subject | Meta WhatsApp Business Platform / Cloud API |
| Repository | developers.facebook.com/documentation/business-messaging/whatsapp |
| Version | Graph API `v23.0` (dapat dikonfigurasi) |
| License | API resmi — tunduk pada platform dan kebijakan Meta |
| Research date | 2026-11-26 |

## Temuan

- Pengiriman: `POST /{version}/{phone_number_id}/messages` dengan bearer token.
- Media: upload `POST /{version}/{phone_number_id}/media` (multipart) menghasilkan media ID.
- Template: `GET/POST /{version}/{business_account_id}/message_templates`.
- Webhook: verifikasi `hub.mode=subscribe` + challenge + verify token; event `messages` dan `statuses`.
- Keamanan webhook: `X-Hub-Signature-256` = HMAC-SHA256 atas **raw body** dengan app secret.
- Status Meta: `sent`, `delivered`, `read`, `failed`, `warning`. Meta boleh melompati status perantara.

## Keputusan UnWhats

- `packages/provider-meta` menjadi adapter produksi resmi (ADR 0010).
- Error Meta dipetakan ke error registry; pesan error mentah tidak diteruskan ke konsumen.
- Signature diverifikasi dengan constant-time comparison.
- Status dinormalisasi ke status UnWhats; status asli tetap disimpan.
- Message retrieval tidak tersedia di Cloud API → status dilacak lewat webhook.

## Status implementasi

Text, template, media, interactive, health check, webhook verification, inbound messages, dan status tracking sudah diimplementasikan dan diuji dengan mock.
