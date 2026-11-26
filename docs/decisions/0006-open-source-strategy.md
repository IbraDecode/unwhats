# ADR 0006 — Strategi Open Source + Private Products

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Lisensi proyek referensi beragam: MIT, MPL-2.0, Apache-2.0 + ketentuan tambahan, Hippocratic. Mencampur kode berlisensi ke produk proprietary berisiko.

## Decision

Fondasi open-source terpisah dari produk cloud/enterprise. Apache-2.0 untuk kode baru yang dibuka, CC BY 4.0 untuk dokumentasi. Audit lisensi per dependency wajib. Hybrid monorepo → multi-repository saat stabil.

## Consequences

Komunitas bisa berkontribusi tanpa membuka backend komersial. Perlu tata kelola repository dan NOTICE yang rapi.
