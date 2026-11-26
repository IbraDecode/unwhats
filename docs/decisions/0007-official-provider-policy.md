# ADR 0007 — Hanya Provider Resmi untuk Produksi

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Baileys dan whatsmeow adalah klien unofficial. Lisensi open-source mereka mengatur kode sumber, bukan izin platform dari Meta. Kebijakan WhatsApp melarang unofficial clients dan automation yang merugikan.

## Decision

Produksi memakai Meta Cloud API dan provider terautorisasi. Baileys/whatsmeow menjadi objek riset di UnWhats Labs, bukan konektor produksi.

## Consequences

Kepatuhan platform terjaga. Tidak ada fitur koneksi unofficial di produk komersial. Riset tetap berjalan dengan batas jelas.
