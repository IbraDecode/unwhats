import { describe, expect, it } from "vitest";
import { fakeAcceptedEvent, fakeMessage, fakePrincipal, uniqueId } from "../src/index.js";

describe("fixture testing", () => {
  it("membuat principal dengan scope", () => {
    const principal = fakePrincipal();
    expect(principal.scopes).toContain("messages:write");
    expect(principal.organization_id).toMatch(/^org_/);
  });

  it("membuat pesan dan event yang valid", () => {
    const message = fakeMessage();
    expect(message.status).toBe("accepted");
    const event = fakeAcceptedEvent(message.id);
    expect(event.type).toBe("message.accepted");
    expect(event.data["message_id"]).toBe(message.id);
  });

  it("membuat ID unik", () => {
    expect(uniqueId("msg")).not.toBe(uniqueId("msg"));
  });
});
