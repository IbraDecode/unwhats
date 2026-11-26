# Panduan Mulai Pengembangan

## Prasyarat

- Node.js >= 22
- pnpm 12.21.0 (via Corepack)
- Docker + Docker Compose

## Instalasi

```bash
corepack enable
pnpm install
pnpm check
```

`pnpm check` menjalankan lint, typecheck, test, dan build seluruh workspace.

## Menjalankan API lokal

```bash
cp .env.example .env
docker compose -f infrastructure/docker/docker-compose.yml up --build
```

Atau tanpa Docker (API memakai store in-memory):

```bash
API_KEY_DEV=uw_test_localdevelopmentkey pnpm --filter @unwhats/api dev
```

## Contoh request

```bash
curl http://localhost:3000/health

curl -H "Authorization: Bearer uw_test_localdevelopmentkey" \
  http://localhost:3000/v1/providers

curl -X POST http://localhost:3000/v1/messages \
  -H "Authorization: Bearer uw_test_localdevelopmentkey" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: contoh-001" \
  -d '{"provider":"in-memory","to":"+6281234567890","type":"text","text":{"body":"Halo"}}'
```

## Struktur test

- `test/` di setiap package: unit test Vitest.
- `apps/api/test/api.test.ts`: integration test melalui Fastify `inject`.
- Contract test direncanakan: OpenAPI vs implementasi.

## Troubleshooting

- `pnpm install` gagal → pastikan `packageManager` sesuai dan Corepack aktif.
- Test gagal setelah perubahan package → jalankan `pnpm build` dulu (turbo sudah mengurus dependensi).
- Port 3000 dipakai → ubah `PORT` di `.env`.
