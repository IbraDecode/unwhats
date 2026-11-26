# ADR 0009 — Transisi Status Maju Saja

- Status: Accepted
- Tanggal: 2026-11-26

## Context

State machine awal hanya mengizinkan transisi bertahap (`accepted → sent → delivered`). Pengujian dengan pola webhook Meta menunjukkan status `delivered` dapat langsung mengikuti `accepted` tanpa `sent`. State machine yang terlalu ketat mengabaikan event sah.

## Decision

Transisi diizinkan bila peringkat status target lebih tinggi dari status saat ini. Transisi mundur ditolak. `failed` dapat terjadi dari status non-terminal mana pun. Status terminal (`read`, `failed`) tidak dapat bertransisi kecuali ke dirinya sendiri.

Peringkat: `queued(0) < accepted(1) < sent(2) < delivered(3) < read(4)`; `failed(5)`.

## Consequences

Event nyata dari provider tidak hilang. Dashboard tetap konsisten karena status tidak pernah mundur. Transisi langsung harus dicatat pada `provider_message_status` untuk audit.
