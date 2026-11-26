export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY = /authorization|api[-_]?key|secret|token|password|cookie|credential/i;

export interface LogSink {
  (line: string): void;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  sink?: LogSink;
  bindings?: Record<string, unknown>;
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(item);
  }
  return result;
}

export function createLogger(options: LoggerOptions): Logger {
  const level = options.level ?? "info";
  const sink = options.sink ?? ((line: string) => console.log(line));
  const bindings = redact(options.bindings ?? {}) as Record<string, unknown>;

  function write(severity: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[severity] < LEVEL_WEIGHT[level]) return;
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level: severity,
      service: options.name,
      message,
      ...bindings,
      ...((redact(context ?? {}) as Record<string, unknown>) satisfies Record<string, unknown>),
    });
    sink(line);
  }

  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
    child: (extra) =>
      createLogger({
        name: options.name,
        level,
        sink,
        bindings: { ...bindings, ...(redact(extra) as Record<string, unknown>) },
      }),
  };
}
