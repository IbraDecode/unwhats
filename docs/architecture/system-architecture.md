# UnWhats System Architecture

Diagram tekstal dan penjelasan lengkap tersedia di [ARCHITECTURE.md](../../ARCHITECTURE.md). Ringkasan alur:

```text
KLIEN
Dashboard · SDK · CLI · External Apps · MCP Clients
        │
API GATEWAY
REST · WebSocket (rencana) · API Keys · Auth · Scope · Rate Limit
        │
APPLICATION CORE
Organization · Provider Registry · Message · Webhook · Template · Usage · Policy · Event Router
        │
PROVIDER ABSTRACTION
Meta Cloud API (production) · Authorized providers · Labs (research only)
        │
INFRASTRUCTURE
PostgreSQL · Redis · Queue · Object Storage · Secrets · OpenTelemetry
```

## Pemisahan

- **Control Plane**: organization, user, API key, project, provider config, billing, permission, deployment.
- **Data Plane**: API request, message orchestration, provider call, webhook event, delivery status, event processing, queue.

## Aturan boundary

1. `core` tidak mengimpor adapter.
2. Adapter bergantung pada `provider-sdk` dan `contracts`.
3. MCP bergantung pada API publik (SDK), bukan database.
4. Setiap request memiliki `request_id` dan `correlation_id`.
5. Semua data tenant difilter oleh `organization_id`.
