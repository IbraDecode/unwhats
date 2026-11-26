import { describe, expect, it } from "vitest";
import {
  EVENT_TYPES,
  IdSchema,
  MessageSchema,
  SendMessageInputSchema,
  cursorPageSchema,
} from "../src/index.js";

const validMessage = {
  object: "message" as const,
  id: "msg_01JXYZ123ABCDEF",
  organization_id: "org_01JXYZ123ABCDEF",
  project_id: "prj_01JXYZ123ABCDEF",
  provider_id: "meta-cloud",
  provider_message_id: null,
  provider_message_status: null,
  direction: "outbound" as const,
  type: "text" as const,
  status: "accepted" as const,
  to: "+6281234567890",
  from: null,
  text: { body: "Halo" },
  template: null,
  media: null,
  interactive: null,
  metadata: {},
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

describe("contracts", () => {
  it("menerima ID dengan format UnWhats", () => {
    expect(IdSchema.safeParse("msg_01JXYZ123ABCDEF").success).toBe(true);
    expect(IdSchema.safeParse("msg-bad-id").success).toBe(false);
  });

  it("memvalidasi model pesan", () => {
    expect(MessageSchema.safeParse(validMessage).success).toBe(true);
    expect(MessageSchema.safeParse({ ...validMessage, status: "unknown" }).success).toBe(false);
  });

  it("menolak pesan teks tanpa text.body", () => {
    const result = SendMessageInputSchema.safeParse({
      provider: "meta-cloud",
      to: "+6281234567890",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("menerima pesan teks yang valid", () => {
    const result = SendMessageInputSchema.safeParse({
      provider: "meta-cloud",
      to: "+6281234567890",
      type: "text",
      text: { body: "Halo" },
    });
    expect(result.success).toBe(true);
  });

  it("memiliki event type yang stabil", () => {
    expect(EVENT_TYPES).toContain("message.delivered");
    expect(EVENT_TYPES).toContain("webhook.failed");
  });

  it("membuat skema pagination generik", () => {
    const schema = cursorPageSchema(MessageSchema);
    expect(schema.safeParse({ data: [validMessage], has_more: false, next_cursor: null }).success).toBe(
      true,
    );
  });
});
