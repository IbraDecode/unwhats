import type { AuthenticatedPrincipal, Message } from "@unwhats/contracts";
import { createEvent, createId } from "@unwhats/core";

export function fakePrincipal(overrides: Partial<AuthenticatedPrincipal> = {}): AuthenticatedPrincipal {
  return {
    type: "api_key",
    id: createId("key"),
    organization_id: "org_01JXYZ123ABCDEF",
    project_id: "prj_01JXYZ123ABCDEF",
    scopes: ["messages:read", "messages:write", "providers:read", "webhooks:read", "usage:read"],
    ...overrides,
  };
}

export function fakeMessage(overrides: Partial<Message> = {}): Message {
  const now = new Date().toISOString();
  return {
    object: "message",
    id: createId("msg"),
    organization_id: "org_01JXYZ123ABCDEF",
    project_id: "prj_01JXYZ123ABCDEF",
    provider_id: "in-memory",
    provider_message_id: null,
    provider_message_status: null,
    direction: "outbound",
    type: "text",
    status: "accepted",
    to: "+6281234567890",
    from: null,
    text: { body: "Pesan uji" },
    template: null,
    media: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function fakeAcceptedEvent(messageId = "msg_01JXYZ123ABCDEF") {
  return createEvent({
    type: "message.accepted",
    organization_id: "org_01JXYZ123ABCDEF",
    correlation_id: createId("req"),
    data: { message_id: messageId },
  });
}

export function uniqueId(prefix: Parameters<typeof createId>[0]): string {
  return createId(prefix);
}
