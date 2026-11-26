import { describe, expect, it } from "vitest";
import {
  CapabilityRegistry,
  canTransition,
  createEvent,
  createId,
  emptyCapabilities,
  isIdWithPrefix,
  normalizeProviderStatus,
  transitionMessage,
} from "../src/index.js";
import { createMessage } from "../src/message.js";
import { UnWhatsError } from "@unwhats/errors";

function sampleMessage() {
  return createMessage({
    organization_id: "org_01JXYZ123ABCDEF",
    project_id: "prj_01JXYZ123ABCDEF",
    provider_id: "meta-cloud",
    direction: "outbound",
    type: "text",
    to: "+6281234567890",
  });
}

describe("ID", () => {
  it("menghasilkan ID unik dengan prefix yang benar", () => {
    const a = createId("msg");
    const b = createId("msg");
    expect(a).not.toBe(b);
    expect(isIdWithPrefix(a, "msg")).toBe(true);
    expect(isIdWithPrefix(a, "evt")).toBe(false);
  });

  it("menghasilkan URUTAN yang berbeda untuk pemanggilan berturut-turut", () => {
    const a = createId("evt");
    const b = createId("evt");
    expect(a).not.toBe(b);
    expect(a.length).toBe(b.length);
  });
});

describe("status message", () => {
  it("mengizinkan transisi maju", () => {
    expect(canTransition("queued", "accepted")).toBe(true);
    expect(canTransition("sent", "delivered")).toBe(true);
    expect(canTransition("delivered", "read")).toBe(true);
  });

  it("mengizinkan lompatan status maju", () => {
    expect(canTransition("queued", "sent")).toBe(true);
    expect(canTransition("accepted", "delivered")).toBe(true);
    expect(() => transitionMessage(sampleMessage(), "delivered")).not.toThrow();
  });

  it("menolak transisi mundur", () => {
    expect(canTransition("delivered", "sent")).toBe(false);
    expect(canTransition("read", "delivered")).toBe(false);
  });

  it("menolak transisi keluar dari status terminal", () => {
    const message = { ...sampleMessage(), status: "failed" as const };
    expect(() => transitionMessage(message, "accepted")).toThrow(UnWhatsError);
  });

  it("menormalkan status provider", () => {
    expect(normalizeProviderStatus("DELIVERED")).toBe("delivered");
    expect(normalizeProviderStatus("seen", { seen: "read" })).toBe("read");
    expect(normalizeProviderStatus("unknown-state")).toBeNull();
  });
});

describe("capability", () => {
  it("mensyaratkan capability sesuai tipe pesan", () => {
    const registry = new CapabilityRegistry();
    const caps = { ...emptyCapabilities(), text: true };
    registry.register("meta-cloud", caps);

    expect(() => registry.assertForMessageType("meta-cloud", "text")).not.toThrow();
    expect(() => registry.assertForMessageType("meta-cloud", "image")).toThrow(UnWhatsError);
    expect(() => registry.assertForMessageType("unknown", "text")).toThrow(UnWhatsError);
  });
});

describe("event", () => {
  it("membuat event dengan versi skema dan correlation ID", () => {
    const event = createEvent({
      type: "message.accepted",
      organization_id: "org_01JXYZ123ABCDEF",
      correlation_id: "req_01JXYZ123ABCDEF",
      data: { message_id: "msg_01JXYZ123ABCDEF" },
    });
    expect(event.version).toBe("2026-01-01");
    expect(event.id.startsWith("evt_")).toBe(true);
    expect(event.correlation_id).toBe("req_01JXYZ123ABCDEF");
  });
});
