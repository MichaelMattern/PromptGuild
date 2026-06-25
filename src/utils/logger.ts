import { maskSecrets } from "./maskSecrets";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const priority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

export class Logger {
  constructor(private readonly level: LogLevel = "info") {}

  debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }

  child(): Logger {
    return new Logger(this.level);
  }

  private write(level: Exclude<LogLevel, "silent">, message: string, meta?: unknown): void {
    if (priority[level] < priority[this.level]) {
      return;
    }

    const suffix = meta === undefined ? "" : ` ${maskSecrets(meta)}`;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${maskSecrets(message)}${suffix}`;

    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export function parseLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error" || value === "silent") {
    return value;
  }

  return "info";
}
