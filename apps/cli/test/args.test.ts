import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/args.js";

describe("parseArgs", () => {
  it("memisahkan command, subcommand, dan flag", () => {
    const parsed = parseArgs(["messages", "send", "--to", "+6281", "--body", "Halo", "--verbose"]);
    expect(parsed.command).toBe("messages");
    expect(parsed.subcommand).toBe("send");
    expect(parsed.flags["to"]).toBe("+6281");
    expect(parsed.flags["verbose"]).toBe(true);
  });

  it("mengembalikan help sebagai default", () => {
    expect(parseArgs([]).command).toBe("help");
  });
});
