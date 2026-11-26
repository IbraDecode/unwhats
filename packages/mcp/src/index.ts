import type { CreateWebhookInput } from "@unwhats/contracts";
import type { UnWhatsClient } from "@unwhats/sdk-js";
import { UnWhatsError } from "@unwhats/errors";

export type ToolPermission = "read" | "write" | "approval";

export interface ToolDefinition {
  name: string;
  description: string;
  permission: ToolPermission;
  required_scope: string;
  inputSchema: Record<string, unknown>;
}

const EMPTY_SCHEMA: Record<string, unknown> = { type: "object", properties: {} };

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: "get_health",
    description: "Memeriksa kesehatan layanan UnWhats",
    permission: "read",
    required_scope: "providers:read",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "list_providers",
    description: "Melihat daftar provider yang tersedia",
    permission: "read",
    required_scope: "providers:read",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "get_provider_status",
    description: "Melihat detail dan kapabilitas satu provider",
    permission: "read",
    required_scope: "providers:read",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_messages",
    description: "Melihat riwayat pesan yang diizinkan",
    permission: "read",
    required_scope: "messages:read",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" }, starting_after: { type: "string" } },
    },
  },
  {
    name: "get_message",
    description: "Melihat detail satu pesan",
    permission: "read",
    required_scope: "messages:read",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_webhooks",
    description: "Melihat daftar webhook endpoint",
    permission: "read",
    required_scope: "webhooks:read",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "get_usage",
    description: "Melihat ringkasan penggunaan",
    permission: "read",
    required_scope: "usage:read",
    inputSchema: EMPTY_SCHEMA,
  },
  {
    name: "create_webhook",
    description: "Membuat webhook endpoint baru",
    permission: "write",
    required_scope: "webhooks:write",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", format: "uri" }, events: { type: "array" } },
      required: ["url", "events"],
    },
  },
  {
    name: "send_message",
    description: "Mengirim pesan melalui provider resmi (memerlukan persetujuan eksplisit)",
    permission: "approval",
    required_scope: "messages:write",
    inputSchema: {
      type: "object",
      properties: {
        provider: { type: "string" },
        to: { type: "string" },
        type: { type: "string" },
        text: { type: "object" },
      },
      required: ["provider", "to", "type"],
    },
  },
];

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(definitions: readonly ToolDefinition[] = TOOL_DEFINITIONS) {
    for (const definition of definitions) this.tools.set(definition.name, definition);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new UnWhatsError({
        code: "RESOURCE_NOT_FOUND",
        message: `Tool ${name} tidak ditemukan`,
        details: { tool: name },
      });
    }
    return tool;
  }

  /** Default read-only: tool write/approval ditolak tanpa scope dan persetujuan. */
  authorize(name: string, scopes: readonly string[], approved = false): ToolDefinition {
    const tool = this.get(name);
    if (!scopes.includes(tool.required_scope)) {
      throw new UnWhatsError({
        code: "AUTHORIZATION_ERROR",
        message: `Tool ${name} memerlukan scope ${tool.required_scope}`,
        details: { tool: name, required_scope: tool.required_scope },
      });
    }
    if (tool.permission === "approval" && approved !== true) {
      throw new UnWhatsError({
        code: "AUTHORIZATION_ERROR",
        message: `Tool ${name} memerlukan persetujuan manusia`,
        details: { tool: name, approval_required: true },
      });
    }
    return tool;
  }
}

export interface CallToolContext {
  scopes: readonly string[];
  approved?: boolean;
  audit?: (entry: { tool: string; scopes: readonly string[]; approved: boolean }) => void;
}

/**
 * MCP adalah adapter di atas API publik. Tidak mengakses database internal.
 */
export class UnWhatsMcpAdapter {
  private readonly registry: ToolRegistry;

  constructor(
    private readonly client: UnWhatsClient,
    registry: ToolRegistry = new ToolRegistry(),
  ) {
    this.registry = registry;
  }

  listTools(): ToolDefinition[] {
    return this.registry.list();
  }

  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    context: CallToolContext,
  ): Promise<unknown> {
    const tool = this.registry.authorize(name, context.scopes, context.approved === true);
    context.audit?.({ tool: name, scopes: context.scopes, approved: context.approved === true });

    switch (name) {
      case "get_health":
        return this.client.health();
      case "list_providers":
        return this.client.listProviders();
      case "get_provider_status":
        return this.client.getProvider(String(args["id"] ?? ""));
      case "list_messages":
        return this.client.listMessages({
          limit: typeof args["limit"] === "number" ? args["limit"] : 20,
          starting_after:
            typeof args["starting_after"] === "string" ? args["starting_after"] : undefined,
        });
      case "get_message":
        return this.client.getMessage(String(args["id"] ?? ""));
      case "list_webhooks":
        return this.client.listWebhooks();
      case "get_usage":
        return this.client.getUsage();
      case "create_webhook":
        return this.client.createWebhook({
          url: String(args["url"] ?? ""),
          events: (args["events"] as CreateWebhookInput["events"] | undefined) ?? [],
        });
      case "send_message":
        return this.client.sendMessage(
          {
            provider: String(args["provider"] ?? ""),
            to: String(args["to"] ?? ""),
            type: (args["type"] as "text") ?? "text",
            text: args["text"] as { body: string } | undefined,
          },
          typeof args["idempotency_key"] === "string" ? args["idempotency_key"] : undefined,
        );
      default:
        throw new UnWhatsError({
          code: "INTERNAL_ERROR",
          message: `Tool ${tool.name} belum memiliki implementasi`,
        });
    }
  }
}
