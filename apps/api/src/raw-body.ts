import type { FastifyInstance, FastifyRequest } from "fastify";

const rawBodies = new WeakMap<FastifyRequest, string>();

/**
 * Meta menandatangani raw body HTTP. Parser bawaan Fastify hanya menyimpan
 * objek hasil parse, jadi kita simpan string mentahnya juga.
 */
export function installRawBodyCapture(app: FastifyInstance): void {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const raw = typeof body === "string" ? body : String(body ?? "");
    rawBodies.set(request, raw);
    try {
      done(null, JSON.parse(raw));
    } catch (error) {
      done(error as Error, undefined);
    }
  });
}

export function rawBodyOf(request: FastifyRequest): string {
  return rawBodies.get(request) ?? "";
}
