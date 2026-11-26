import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseMetaWebhook,
  verifyMetaSignature,
  verifySubscribeToken,
} from "../src/index.js";

const secret = "a-very-long-app-secret-for-tests";

function signature(payload: string, value = secret): string {
  return `sha256=${createHmac("sha256", value).update(payload).digest("hex")}`;
}

const inboundPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "biz_1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "628111", phone_number_id: "123456789" },
            contacts: [{ wa_id: "6281234567890", profile: { name: "Ibra" } }],
            messages: [
              {
                id: "wamid.in.1",
                from: "6281234567890",
                timestamp: "1795651200",
                type: "text",
                text: { body: "Halo balik" },
              },
              {
                id: "wamid.in.2",
                from: "6281234567890",
                timestamp: "1795651200",
                type: "reaction",
              },
            ],
            statuses: [
              {
                id: "wamid.out.1",
                status: "delivered",
                timestamp: "1795651201",
                recipient_id: "6281234567890",
              },
              {
                id: "wamid.out.1",
                status: "warning",
                timestamp: "1795651202",
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("verifikasi webhook Meta", () => {
  it("menerima signature yang sah", () => {
    const payload = JSON.stringify(inboundPayload);
    expect(verifyMetaSignature(payload, signature(payload), secret)).toBe(true);
  });

  it("menolak signature salah", () => {
    const payload = JSON.stringify(inboundPayload);
    expect(verifyMetaSignature(payload, signature(payload, "secret-lain"), secret)).toBe(false);
    expect(verifyMetaSignature(payload, undefined, secret)).toBe(false);
    expect(verifyMetaSignature(payload, "md5=abc", secret)).toBe(false);
  });

  it("memverifikasi subscribe token", () => {
    expect(
      verifySubscribeToken({
        mode: "subscribe",
        challenge: "challenge-xyz",
        token: "verify-token-123",
        expectedToken: "verify-token-123",
      }),
    ).toBe("challenge-xyz");
    expect(() =>
      verifySubscribeToken({ mode: "subscribe", token: "salah", expectedToken: "benar" }),
    ).toThrow();
  });
});

describe("normalisasi webhook Meta", () => {
  it("mengubah pesan masuk dan status menjadi event internal", () => {
    const events = parseMetaWebhook(inboundPayload);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "message",
      message_id: "wamid.in.1",
      from: "6281234567890",
      to: "123456789",
      type: "text",
      body: "Halo balik",
      contact_name: "Ibra",
    });
    expect(events[1]).toMatchObject({
      kind: "status",
      message_id: "wamid.out.1",
      status: "delivered",
    });
  });

  it("menolak payload tanpa struktur Meta", () => {
    expect(() => parseMetaWebhook({ object: "lain" })).toThrow();
  });
});
