import type { Request } from 'express';

type LogArgs = [message: string, ...args: unknown[]] | [Request, string, ...unknown[]];

/**
 * Supported log levels for the application logger ordered by verbosity.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/** Priority map used to determine whether a message should be emitted. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Minimal logger for consistent structured output with timestamp + level.
 * Defaults to INFO level but can be configured via LOG_LEVEL env or setLogLevel.
 */
export class Logger {
  private static currentLevel: LogLevel = Logger.resolveInitialLevel();

  /** Programmatically override the active log level. */
  static setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /** Logs low-level diagnostic information. */
  static debug(...args: LogArgs): void {
    this.log(LogLevel.DEBUG, args);
  }

  /** Logs high-level informational events. */
  static info(...args: LogArgs): void {
    this.log(LogLevel.INFO, args);
  }

  /** Logs notable warnings that aren’t fatal. */
  static warn(...args: LogArgs): void {
    this.log(LogLevel.WARN, args);
  }

  /** Logs errors and exceptions. */
  static error(...args: LogArgs): void {
    this.log(LogLevel.ERROR, args);
  }

  private static shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.currentLevel];
  }

  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private static formatRequestContext(httpRequest: Request): string {
    const method = httpRequest.method?.toUpperCase() || 'UNKNOWN';
    const path = httpRequest.originalUrl || httpRequest.url || '';
    return `[${method} ${path}]`;
  }

  private static normalizeArgs(args: LogArgs): { message: string; args: unknown[] } {
    if (args[0] && typeof args[0] === 'object' && 'method' in (args[0] as object)) {
      const [httpRequest, message, ...rest] = args as [Request, string, ...unknown[]];
      const context = this.formatRequestContext(httpRequest);
      return { message: `${context} ${message}`, args: rest };
    }

    const [message, ...rest] = args as [string, ...unknown[]];
    return { message, args: rest };
  }

  private static resolveInitialLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
    return envLevel && envLevel in LogLevel ? envLevel : LogLevel.INFO;
  }

  private static log(level: LogLevel, args: LogArgs): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const normalized = this.normalizeArgs(args);
    this.write(level, normalized.message, normalized.args);
  }

  private static write(level: LogLevel, message: string, args: unknown[]): void {
    const formattedMessage = this.formatMessage(level, message);
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }
}
