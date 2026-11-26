export interface ParsedArgs {
  command: string;
  subcommand?: string;
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, subcommand, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === undefined || !token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return { command: command ?? "help", subcommand, flags };
}

export function clientConfig(flags: Record<string, string | boolean>) {
  return {
    baseUrl:
      typeof flags["api-url"] === "string"
        ? flags["api-url"]
        : (process.env["UNWHATS_API_URL"] ?? "http://localhost:3000"),
    apiKey:
      typeof flags["api-key"] === "string"
        ? flags["api-key"]
        : (process.env["UNWHATS_API_KEY"] ?? ""),
  };
}
