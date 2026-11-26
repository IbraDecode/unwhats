import { createHash, randomBytes } from "node:crypto";
import type { ApiKeyScope, AuthenticatedPrincipal } from "@unwhats/contracts";
import { createId } from "@unwhats/core";
import { UnWhatsError } from "@unwhats/errors";

export const ALL_SCOPES: readonly ApiKeyScope[] = [
  "messages:read",
  "messages:write",
  "providers:read",
  "webhooks:read",
  "webhooks:write",
  "usage:read",
];

export interface ApiKeyRecord {
  id: string;
  organization_id: string;
  project_id: string | null;
  scopes: ApiKeyScope[];
  key_hash: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface AddApiKeyInput {
  organization_id: string;
  project_id?: string | null;
  scopes?: ApiKeyScope[];
  rawKey?: string;
}

/** API key tidak pernah disimpan plaintext. Hanya hash SHA-256 yang disimpan. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(mode: "live" | "test" = "test"): string {
  return `uw_${mode}_${randomBytes(24).toString("base64url")}`;
}

export class InMemoryApiKeyStore {
  private readonly records = new Map<string, ApiKeyRecord>();

  add(input: AddApiKeyInput): { rawKey: string; record: ApiKeyRecord } {
    const rawKey = input.rawKey ?? generateApiKey("test");
    const hash = hashApiKey(rawKey);
    const record: ApiKeyRecord = {
      id: createId("key"),
      organization_id: input.organization_id,
      project_id: input.project_id ?? null,
      scopes: input.scopes ?? [...ALL_SCOPES],
      key_hash: hash,
      prefix: rawKey.slice(0, 12),
      created_at: new Date().toISOString(),
      last_used_at: null,
      revoked: false,
    };
    this.records.set(hash, record);
    return { rawKey, record };
  }

  authenticate(rawKey: string): AuthenticatedPrincipal {
    const record = this.records.get(hashApiKey(rawKey));
    if (record === undefined || record.revoked) {
      throw new UnWhatsError({ code: "AUTHENTICATION_ERROR" });
    }
    record.last_used_at = new Date().toISOString();
    return {
      type: "api_key",
      id: record.id,
      organization_id: record.organization_id,
      project_id: record.project_id,
      scopes: record.scopes,
    };
  }

  revoke(id: string): void {
    for (const record of this.records.values()) {
      if (record.id === id) record.revoked = true;
    }
  }

  list(organizationId: string): ApiKeyRecord[] {
    return [...this.records.values()]
      .filter((record) => record.organization_id === organizationId)
      .map((record) => ({ ...record, key_hash: "[REDACTED]" }));
  }
}

export function requireScope(principal: AuthenticatedPrincipal, scope: ApiKeyScope): void {
  if (!principal.scopes.includes(scope)) {
    throw new UnWhatsError({
      code: "AUTHORIZATION_ERROR",
      details: { required_scope: scope, principal_id: principal.id },
    });
  }
}

export function extractBearer(header: string | undefined): string | null {
  if (header === undefined) return null;
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (header.startsWith("uw_")) return header.trim();
  return null;
}
