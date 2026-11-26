# Berkontribusi ke UnWhats

Terima kasih telah berkontribusi. UnWhats adalah proyek infrastruktur; perubahan kecil pun harus dapat diuji dan ditelusur.

## Sebelum mulai

- Baca [ARCHITECTURE.md](./ARCHITECTURE.md), [TMD](./docs/TECHNICAL-MASTER-DOCUMENT.md), dan ADR yang relevan.
- Untuk perubahan arsitektur, buat ADR baru terlebih dahulu.
- pastikan tidak ada perubahan yang melanggar [COMPLIANCE.md](./COMPLIANCE.md).

## Alur kerja

```text
main
develop
feature/*
fix/*
release/*
hotfix/*
```

1. Fork/clone, lalu buat branch dari `develop`.
2. Kerjakan perubahan satu topik per branch.
3. Jalankan `pnpm check` sebelum mengirim PR.
4. Buat Pull Request ke `develop`. CI wajib lolos.
5. Minimal satu review sebelum merge.
6. Tambahkan changeset untuk perubahan yang dirilis (`pnpm changeset`).

## Konvensi commit

```text
feat:     fitur baru
fix:      perbaikan bug
docs:     dokumentasi
refactor: perubahan struktur tanpa ubah perilaku
test:     penambahan/perbaikan test
chore:    tooling dan pemeliharaan
security: perbaikan keamanan
```

Contoh: `feat(provider-sdk): tambah state machine lifecycle`

## Aturan kode

- TypeScript strict mode. Gunakan `import type` untuk tipe.
- `core` tidak boleh mengimpor adapter/provider tertentu.
- Semua error yang keluar ke API harus memakai `UnWhatsError`.
- API key, secret, dan token tidak boleh muncul di log (lihat `@unwhats/logger`).
- Endpoint baru wajib ditambahkan ke OpenAPI (`packages/openapi`).
- Setiap fitur baru wajib memiliki unit test.

## Definition of Done

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Dokumentasi diperbarui
- [ ] Changeset (untuk package publik)

## Lisensi kontribusi

Kontribusi Anda diberikan di bawah Apache-2.0, kecuali dinyatakan lain. Jangan menyertakan kode dari proyek pihak ketiga tanpa audit lisensi.
