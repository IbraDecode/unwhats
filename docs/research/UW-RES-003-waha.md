# UW-RES-003 — Desain Multi-Engine WAHA

| Field | Isi |
| --- | --- |
| Subject | WAHA |
| Repository | github.com/devlikeapro/waha |
| Research date | 2026-11-26 |

## Temuan

- Engine: WEBJS dan WPP (browser-based), NOWEB (Node/TypeScript), GOWS (Go).
- REST API dan webhook relatif konsisten, tetapi response/payload antar-engine masih berbeda.
- VENOM ditandai deprecated pada dokumentasi engine yang diperiksa.

## Pelajaran

Abstraksi harus mencakup capability, error, status, dan event standar — bukan sekadar menyamakan nama endpoint. Ini menjadi dasar ADR 0002.
