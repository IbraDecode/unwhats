# ADR 0003 — TypeScript sebagai Bahasa Utama, Go sebagai Pendukung

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Baileys, Evolution API, WAHA, dan banyak proyek terkait berada di ekosistem TypeScript. Go dipakai whatsmeow dan cocok untuk komponen konkuren.

## Decision

TypeScript sebagai bahasa utama backend, SDK JS, CLI, dan dashboard. Go untuk SDK Go dan komponen pendukung tertentu.

## Consequences

Reuse ekosistem besar. Perlu menjaga konsistensi kontrak lintas bahasa melalui OpenAPI dan skema bersama.
