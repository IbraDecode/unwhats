# ADR 0008 — snake_case untuk Field API dan Domain

- Status: Accepted
- Tanggal: 2026-11-26

## Context

Blueprint awal memakai camelCase pada contoh model TypeScript dan snake_case pada respons API. Campuran keduanya memicu bug mapping di SDK.

## Decision

Gunakan snake_case secara konsisten untuk field pada kontrak API, skema Zod, dan model domain. Nama package dan tipe TypeScript tetap camelCase/PascalCase.

## Consequences

Tidak ada lapisan mapping antara domain dan API. Konsumen SDK menerima struktur yang sama dengan dokumentasi.
