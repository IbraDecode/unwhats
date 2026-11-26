/**
 * Generator ULID ringan (Crockford Base32) tanpa dependency eksternal.
 * Format: <prefix>_<10 karakter waktu><16 karakter acak>.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const RANDOM_LIMIT = 1n << 80n;

export type IdPrefix =
  | "org"
  | "usr"
  | "prj"
  | "env"
  | "key"
  | "acc"
  | "msg"
  | "evt"
  | "dlv"
  | "whk"
  | "req"
  | "sub"
  | "aud"
  | "svc";

let lastTimestamp = -1n;
let lastRandom = 0n;

function random80(): bigint {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(10));
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

/** Menghasilkan ULID yang monotone dalam satu milidetik yang sama. */
export function ulid(now: number = Date.now()): string {
  const timestamp = BigInt(Math.max(0, Math.trunc(now)));
  if (timestamp === lastTimestamp) {
    lastRandom = (lastRandom + 1n) % RANDOM_LIMIT;
  } else {
    lastTimestamp = timestamp;
    lastRandom = random80();
  }

  const chars = new Array<string>(26);
  let time = timestamp;
  for (let i = 9; i >= 0; i -= 1) {
    chars[i] = CROCKFORD[Number(time & 31n)] ?? "0";
    time >>= 5n;
  }

  let random = lastRandom;
  for (let i = 25; i >= 10; i -= 1) {
    chars[i] = CROCKFORD[Number(random & 31n)] ?? "0";
    random >>= 5n;
  }

  return chars.join("");
}

export function createId(prefix: IdPrefix): string {
  return `${prefix}_${ulid()}`;
}

export function isIdWithPrefix(value: string, prefix: IdPrefix): boolean {
  return new RegExp(`^${prefix}_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$`).test(value);
}

/** ID yang dipakai sebagai kunci idempotensi tidak boleh membocorkan data. */
export function createCorrelationId(): string {
  return createId("req");
}
