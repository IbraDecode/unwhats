# Roadmap UnWhats

Urutan milestone, bukan janji tanggal rilis.

| Milestone | Nama | Status | Fokus |
| --- | --- | --- | --- |
| M0 | Project Foundation | ✅ | Repo, license, governance, ADR, monorepo, tooling |
| M1 | Core Contracts | ✅ | Domain model, provider interface, capability, error, event |
| M2 | API Foundation | ✅ | Fastify, OpenAPI, auth, RBAC scope, validasi, idempotensi |
| M3 | Official Provider | ✅ | Meta Cloud API adapter, webhook verification, inbound messages, template, status tracking |
| M4 | Persistence | ⏳ | Drizzle migration, PostgreSQL RLS, transaksi, outbox nyata |
| M5 | Event Infrastructure | ⏳ | BullMQ, webhook dispatcher, retry, DLQ, event inspector |
| M6 | Developer Experience | 🔶 | SDK JS ✅, SDK Go, CLI ✅ dasar, docs site, playground |
| M7 | Dashboard | ⏳ | Organization, project, API key, provider, log |
| M8 | AI Integration | 🔶 | MCP tool registry ✅, permission ✅, approval workflow |
| M9 | Cloud Control Plane | ⏳ | Tenant, billing, metering, subscription, quota |
| M10 | Enterprise | ⏳ | SSO, dedicated deployment, advanced RBAC, SLA |
| M11 | Ecosystem | ⏳ | Provider lain, plugin, community, SDK tambahan |

## Definition of Done setiap milestone

- [ ] Unit test
- [ ] Integration test
- [ ] Contract test
- [ ] Security review
- [ ] Dokumentasi diperbarui
- [ ] Release notes + versioning
- [ ] Deployment verification

## Sprint 0 — selesai

UW-001…UW-018: repository, pnpm workspace, Turborepo, TypeScript, ESLint, Prettier, Vitest, Docker Compose, PostgreSQL, Redis, Fastify, OpenAPI, core package, provider interface, error registry, event contract, CI, architecture docs.

## Sprint berikutnya

1. Sprint 1 — Core API lanjutan (organization/project nyata di DB, API key rotation).
2. Sprint 2 — Meta Cloud API adapter + webhook inbound ✅ selesai.
3. Sprint 3 — Reliability (outbox PostgreSQL, worker, DLQ).
4. Sprint 4 — SDK Go, docs site, playground, contoh integrasi.

Detail dalam [TMD](./docs/TECHNICAL-MASTER-DOCUMENT.md).
