import { describe, expect, it } from "vitest";
import {
  RETRY_SCHEDULE_SECONDS,
  buildWebhookHeaders,
  maxAttempts,
  retryDelayMs,
  shouldRetry,
  signPayload,
  verifySignature,
} from "../src/index.js";

const secret = "a-long-random-signing-secret";
const payload = JSON.stringify({ id: "evt_01JXYZ123ABCDEF", type: "message.delivered" });

describe("HMAC signature", () => {
  it("memverifikasi payload yang sah", () => {
    const timestamp = 1795651200;
    const signature = signPayload(secret, payload, timestamp);
    expect(
      verifySignature({ signature, payload, secret, timestamp, now: timestamp }),
    ).toBe(true);
  });

  it("menolak payload yang diubah", () => {
    const timestamp = 1795651200;
    const signature = signPayload(secret, payload, timestamp);
    expect(
      verifySignature({
        signature,
        payload: payload + " ",
        secret,
        timestamp,
        now: timestamp,
      }),
    ).toBe(false);
  });

  it("menolak timestamp kadaluarsa", () => {
    const timestamp = 1795651200;
    const signature = signPayload(secret, payload, timestamp);
    expect(verifySignature({ signature, payload, secret, timestamp, now: timestamp + 600 })).toBe(
      false,
    );
  });

  it("menolak format signature salah", () => {
    expect(
      verifySignature({ signature: "md5=abc", payload, secret, timestamp: 1795651200, now: 1795651200 }),
    ).toBe(false);
  });

  it("membangun header lengkap", () => {
    const headers = buildWebhookHeaders({
      secret,
      payload,
      timestamp: 1795651200,
      eventType: "message.delivered",
      deliveryId: "dlv_01JXYZ123ABCDEF",
    });
    expect(headers["x-unwhats-event"]).toBe("message.delivered");
    expect(headers["x-unwhats-signature"]).toMatch(/^sha256=/);
  });
});

describe("retry policy", () => {
  it("memiliki 7 attempt dengan backoff eksponensial", () => {
    expect(RETRY_SCHEDULE_SECONDS).toEqual([0, 5, 30, 120, 600, 1800, 7200]);
    expect(maxAttempts()).toBe(7);
    expect(retryDelayMs(2)).toBe(5000);
    expect(retryDelayMs(7)).toBe(7_200_000);
  });

  it("berhenti setelah attempt terakhir", () => {
    expect(shouldRetry(6)).toBe(true);
    expect(shouldRetry(7)).toBe(false);
  });
});
