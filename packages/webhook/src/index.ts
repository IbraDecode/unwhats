import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-unwhats-signature";
export const EVENT_HEADER = "x-unwhats-event";
export const DELIVERY_HEADER = "x-unwhats-delivery";
export const TIMESTAMP_HEADER = "x-unwhats-timestamp";

export interface WebhookHeaders {
  [SIGNATURE_HEADER]: string;
  [EVENT_HEADER]: string;
  [DELIVERY_HEADER]: string;
  [TIMESTAMP_HEADER]: string;
  "content-type": "application/json";
}

function signatureBase(timestamp: number | string, payload: string): string {
  return `${timestamp}.${payload}`;
}

/** Payload yang ditandatangani harus persis sama dengan body HTTP yang dikirim. */
export function signPayload(secret: string, payload: string, timestamp: number): string {
  const digest = createHmac("sha256", secret)
    .update(signatureBase(timestamp, payload))
    .digest("hex");
  return `sha256=${digest}`;
}

export interface VerifySignatureInput {
  signature: string;
  payload: string;
  secret: string;
  timestamp: number;
  toleranceSeconds?: number;
  now?: number;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verifikasi HMAC-SHA256 dengan constant-time comparison dan toleransi waktu
 * untuk mencegah replay attack.
 */
export function verifySignature(input: VerifySignatureInput): boolean {
  const { signature, payload, secret, timestamp } = input;
  const tolerance = input.toleranceSeconds ?? 300;
  const now = input.now ?? Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now - timestamp) > tolerance) return false;

  const expected = signPayload(secret, payload, timestamp);
  if (!signature.startsWith("sha256=")) return false;

  return safeEqual(signature.slice(7), expected.slice(7));
}

export interface BuildHeadersInput {
  secret: string;
  payload: string;
  timestamp: number;
  eventType: string;
  deliveryId: string;
}

export function buildWebhookHeaders(input: BuildHeadersInput): WebhookHeaders {
  return {
    [SIGNATURE_HEADER]: signPayload(input.secret, input.payload, input.timestamp),
    [EVENT_HEADER]: input.eventType,
    [DELIVERY_HEADER]: input.deliveryId,
    [TIMESTAMP_HEADER]: String(input.timestamp),
    "content-type": "application/json",
  };
}

/** Jeda dalam detik untuk attempt ke-1 sampai ke-7. */
export const RETRY_SCHEDULE_SECONDS = [0, 5, 30, 120, 600, 1800, 7200] as const;

export function maxAttempts(): number {
  return RETRY_SCHEDULE_SECONDS.length;
}

export function shouldRetry(attempt: number): boolean {
  return attempt < maxAttempts();
}

/** attempt dimulai dari 1. */
export function retryDelayMs(attempt: number, jitter = 0): number {
  if (attempt < 1) return 0;
  const seconds = RETRY_SCHEDULE_SECONDS[Math.min(attempt - 1, maxAttempts() - 1)] ?? 0;
  return Math.max(0, seconds * 1000 + jitter);
}
