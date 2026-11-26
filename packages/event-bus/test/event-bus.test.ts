import { describe, expect, it } from "vitest";
import { InMemoryEventBus, InMemoryOutbox, drainOutbox } from "../src/index.js";
import { createEvent } from "@unwhats/core";

function sampleEvent() {
  return createEvent({
    type: "message.accepted",
    organization_id: "org_01JXYZ123ABCDEF",
    correlation_id: "req_01JXYZ123ABCDEF",
    data: { message_id: "msg_01JXYZ123ABCDEF" },
  });
}

describe("InMemoryEventBus", () => {
  it("mengirim event ke subscriber yang sesuai", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe("message.accepted", (event) => {
      received.push(event.id);
    });
    await bus.publish(sampleEvent());
    expect(received).toHaveLength(1);
    await bus.close();
  });

  it("mendukung wildcard subscriber", async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe("*", (event) => {
      received.push(event.type);
    });
    await bus.publish(sampleEvent());
    expect(received).toEqual(["message.accepted"]);
  });
});

describe("transactional outbox", () => {
  it("mempublikasikan event pending lalu menandainya", async () => {
    const outbox = new InMemoryOutbox();
    const bus = new InMemoryEventBus();
    const event = sampleEvent();
    await outbox.append(event);

    const result = await drainOutbox(outbox, bus);
    expect(result).toEqual({ published: 1, failed: 0 });
    expect((await outbox.pending(10)).length).toBe(0);
    expect(outbox.all()[0]?.published_at).not.toBeNull();
  });

  it("mencatat kegagalan dan tidak menandai published", async () => {
    const outbox = new InMemoryOutbox();
    const bus = new InMemoryEventBus();
    bus.subscribe("message.accepted", () => {
      throw new Error("consumer down");
    });
    await outbox.append(sampleEvent());

    const result = await drainOutbox(outbox, bus);
    expect(result.failed).toBe(1);
    expect(outbox.all()[0]?.attempts).toBe(1);
    expect(outbox.all()[0]?.published_at).toBeNull();
  });
});
