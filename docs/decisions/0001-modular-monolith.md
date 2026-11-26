# ADR 0001 — Modular Monolith Terlebih Dahulu

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Ekosistem referensi (WAHA, Evolution API, open-wa) menunjukkan berbagai pendekatan multi-engine. Microservices memberi isolasi, tetapi menambah kompleksitas operasional, jaringan, dan konsistensi data pada tahap awal.

## Decision

Bangun modular monolith dengan boundary domain yang jelas. Pecah menjadi layanan terpisah hanya ketika ada kebutuhan skala yang terukur.

## Consequences

Positif: pengembangan awal cepat, transaksi database sederhana, deployment mudah.
Negatif: perlu disiplin boundary modul agar tidak menjadi "big ball of mud". Mitigasi: aturan arah dependency dan ADR.
