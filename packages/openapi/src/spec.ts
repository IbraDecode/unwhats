/**
 * OpenAPI 3.1 adalah sumber kebenaran kontrak HTTP UnWhats v1.
 * Perubahan yang memecah kompatibilitas harus masuk ke /v2.
 */
export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "UnWhats API",
    version: "1.0.0",
    description:
      "Messaging Infrastructure, Reimagined. API untuk mengirim pesan melalui provider resmi yang terautorisasi, mengelola webhook, dan memantau penggunaan.",
    license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    contact: { name: "UnWhats", url: "https://unwhats.dev" },
  },
  servers: [
    { url: "https://api.unwhats.dev", description: "Production" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  tags: [
    { name: "Health" },
    { name: "Projects" },
    { name: "Providers" },
    { name: "Messages" },
    { name: "Webhooks" },
    { name: "Usage" },
    { name: "Events" },
    { name: "Templates" },
  ],
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        security: [],
        responses: {
          "200": { description: "Layanan hidup", content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } } },
        },
      },
    },
    "/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness check",
        security: [],
        responses: {
          "200": { description: "Layanan siap", content: { "application/json": { schema: { $ref: "#/components/schemas/Ready" } } } },
          "503": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/projects": {
      get: {
        tags: ["Projects"],
        summary: "Daftar project",
        responses: {
          "200": { description: "Daftar project", content: { "application/json": { schema: { $ref: "#/components/schemas/CursorPage" } } } },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Membuat project",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 1 } } } } } },
        responses: {
          "201": { description: "Project dibuat", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        },
      },
    },
    "/v1/providers": {
      get: {
        tags: ["Providers"],
        summary: "Daftar provider terdaftar",
        responses: {
          "200": { description: "Daftar provider", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        },
      },
    },
    "/v1/providers/{id}": {
      get: {
        tags: ["Providers"],
        summary: "Detail provider",
        parameters: [{ $ref: "#/components/parameters/ProviderId" }],
        responses: {
          "200": { description: "Detail provider", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "404": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/providers/{id}/capabilities": {
      get: {
        tags: ["Providers"],
        summary: "Kapabilitas provider",
        parameters: [{ $ref: "#/components/parameters/ProviderId" }],
        responses: {
          "200": { description: "Kapabilitas provider", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "404": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/messages": {
      get: {
        tags: ["Messages"],
        summary: "Riwayat pesan dengan cursor pagination",
        parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/StartingAfter" }],
        responses: {
          "200": { description: "Riwayat pesan", content: { "application/json": { schema: { $ref: "#/components/schemas/CursorPage" } } } },
        },
      },
      post: {
        tags: ["Messages"],
        summary: "Mengirim pesan melalui provider resmi",
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessageInput" } } } },
        responses: {
          "200": { description: "Pesan diterima", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "400": { $ref: "#/components/responses/Error" },
          "409": { $ref: "#/components/responses/Error" },
          "422": { $ref: "#/components/responses/Error" },
          "503": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/messages/{id}": {
      get: {
        tags: ["Messages"],
        summary: "Detail pesan",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Detail pesan", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "404": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "Daftar webhook endpoint",
        responses: {
          "200": { description: "Daftar webhook", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Membuat webhook endpoint",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWebhookInput" } } } },
        responses: {
          "201": { description: "Webhook dibuat", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
          "400": { $ref: "#/components/responses/Error" },
        },
      },
    },
    "/v1/webhooks/{id}": {
      patch: {
        tags: ["Webhooks"],
        summary: "Mengubah webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWebhookInput" } } } },
        responses: { "200": { description: "Webhook diubah", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } } },
      },
      delete: {
        tags: ["Webhooks"],
        summary: "Menghapus webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Webhook dihapus" } },
      },
    },
    "/v1/webhooks/{id}/test": {
      post: {
        tags: ["Webhooks"],
        summary: "Menguji pengiriman webhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Hasil pengujian", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } } },
      },
    },
    "/v1/usage": {
      get: {
        tags: ["Usage"],
        summary: "Ringkasan penggunaan",
        responses: {
          "200": { description: "Penggunaan", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        },
      },
    },
    "/v1/events": {
      get: {
        tags: ["Events"],
        summary: "Riwayat event",
        parameters: [{ $ref: "#/components/parameters/Limit" }],
        responses: {
          "200": { description: "Riwayat event", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } },
        },
      },
    },
    "/v1/templates": {
      get: {
        tags: ["Templates"],
        summary: "Daftar template pesan",
        responses: { "200": { description: "Daftar template", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } } },
      },
      post: {
        tags: ["Templates"],
        summary: "Membuat template sesuai dukungan provider",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "language"], properties: { name: { type: "string" }, language: { type: "string" }, components: { type: "array", items: {} } } } } } },
        responses: { "201": { description: "Template dibuat", content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } } } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "Gunakan uw_live_... atau uw_test_...",
      },
    },
    parameters: {
      ProviderId: { name: "id", in: "path", required: true, schema: { type: "string" } },
      Limit: { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      StartingAfter: { name: "starting_after", in: "query", schema: { type: "string" } },
      IdempotencyKey: {
        name: "Idempotency-Key",
        in: "header",
        required: false,
        description: "Kunci idempotensi unik per operasi. Disimpan selama 24 jam.",
        schema: { type: "string", maxLength: 255 },
      },
    },
    responses: {
      Error: {
        description: "Error standar UnWhats",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
    schemas: {
      Message: {
        type: "object",
        required: ["object", "id", "provider_id", "direction", "type", "status", "to", "created_at"],
        properties: {
          object: { type: "string", const: "message" },
          id: { type: "string", example: "msg_01JXYZ123ABCDEF" },
          organization_id: { type: "string" },
          project_id: { type: "string" },
          provider_id: { type: "string", example: "meta-cloud" },
          provider_message_id: { type: ["string", "null"] },
          provider_message_status: { type: ["string", "null"] },
          direction: { type: "string", enum: ["inbound", "outbound"] },
          type: { type: "string", enum: ["text", "image", "video", "audio", "document", "template", "interactive"] },
          status: { type: "string", enum: ["queued", "accepted", "sent", "delivered", "read", "failed"] },
          to: { type: "string" },
          from: { type: ["string", "null"] },
          text: { type: ["object", "null"], properties: { body: { type: "string" } } },
          template: { type: ["object", "null"] },
          media: { type: ["object", "null"] },
          metadata: { type: "object", additionalProperties: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      SendMessageInput: {
        type: "object",
        required: ["provider", "to", "type"],
        properties: {
          provider: { type: "string", example: "meta-cloud" },
          to: { type: "string", example: "+6281234567890" },
          type: { type: "string", enum: ["text", "image", "video", "audio", "document", "template", "interactive"] },
          text: { type: "object", properties: { body: { type: "string", minLength: 1, maxLength: 4096 } } },
          template: { type: "object", properties: { name: { type: "string" }, language: { type: "string" }, components: { type: "array", items: {} } } },
          media: { type: "object" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
      ProviderCapabilities: {
        type: "object",
        required: ["text", "media", "templates", "interactive", "inbound_messages", "delivery_receipts", "read_receipts", "groups", "calling"],
        properties: {
          version: { type: "string", default: "1" },
          text: { type: "boolean" }, media: { type: "boolean" }, templates: { type: "boolean" },
          interactive: { type: "boolean" }, inbound_messages: { type: "boolean" },
          delivery_receipts: { type: "boolean" }, read_receipts: { type: "boolean" },
          groups: { type: "boolean" }, calling: { type: "boolean" },
        },
      },
      ProviderDescriptor: {
        type: "object",
        required: ["id", "name", "version", "description", "lifecycle", "capabilities", "production_ready"],
        properties: {
          id: { type: "string" }, name: { type: "string" }, version: { type: "string" },
          description: { type: "string" },
          lifecycle: { type: "string", enum: ["registered", "configured", "initializing", "ready", "degraded", "failed", "stopping", "stopped"] },
          capabilities: { $ref: "#/components/schemas/ProviderCapabilities" },
          production_ready: { type: "boolean" },
        },
      },
      CreateWebhookInput: {
        type: "object",
        required: ["url", "events"],
        properties: {
          url: { type: "string", format: "uri" },
          events: { type: "array", minItems: 1, items: { type: "string" } },
          description: { type: "string", maxLength: 500 },
        },
      },
      WebhookEndpoint: {
        type: "object",
        properties: {
          id: { type: "string" }, organization_id: { type: "string" }, project_id: { type: "string" },
          url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["active", "paused", "failed"] },
          description: { type: ["string", "null"] }, secret_prefix: { type: "string" },
          created_at: { type: "string", format: "date-time" }, updated_at: { type: "string", format: "date-time" },
        },
      },
      Event: {
        type: "object",
        required: ["id", "type", "version", "created_at", "correlation_id", "organization_id", "data"],
        properties: {
          id: { type: "string" }, type: { type: "string" }, version: { type: "string" },
          created_at: { type: "string", format: "date-time" }, correlation_id: { type: "string" },
          organization_id: { type: "string" }, data: { type: "object", additionalProperties: true },
        },
      },
      Usage: {
        type: "object",
        properties: {
          object: { type: "string", const: "usage" }, organization_id: { type: "string" },
          period: { type: "object", properties: { start: { type: "string" }, end: { type: "string" } } },
          api_requests: { type: "integer" }, messages_accepted: { type: "integer" },
          messages_delivered: { type: "integer" }, webhook_deliveries: { type: "integer" },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded", "error"] }, service: { type: "string" },
          version: { type: "string" }, uptime_seconds: { type: "number" }, checked_at: { type: "string" },
        },
      },
      Ready: {
        type: "object",
        properties: { ready: { type: "boolean" }, checks: { type: "object", additionalProperties: { type: "boolean" } } },
      },
      Success: {
        type: "object",
        required: ["data", "meta"],
        properties: {
          data: { description: "Payload sesuai endpoint" },
          meta: { type: "object", required: ["request_id"], properties: { request_id: { type: "string" } } },
        },
      },
      CursorPage: {
        type: "object",
        required: ["data", "has_more", "next_cursor"],
        properties: {
          data: { type: "array", items: {} }, has_more: { type: "boolean" },
          next_cursor: { type: ["string", "null"] },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "retryable", "documentation_url"],
            properties: {
              code: { type: "string", example: "UNSUPPORTED_CAPABILITY" },
              message: { type: "string" }, request_id: { type: "string" },
              retryable: { type: "boolean" }, provider_code: { type: "string" },
              documentation_url: { type: "string", format: "uri" },
              details: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;

export function getSpecAsJson(): string {
  return JSON.stringify(openapiSpec, null, 2);
}
