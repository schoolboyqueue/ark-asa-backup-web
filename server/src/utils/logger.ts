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
 * ANSI color codes for terminal output.
 */
const COLORS = {
  RESET: '\x1b[0m',
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  DIM: '\x1b[2m', // Dim for timestamps
} as const;

/**
 * Minimal logger for consistent structured output with timestamp + level.
 * Defaults to INFO level but can be configured via LOG_LEVEL env or setLogLevel.
 *
 * Features:
 * - Colored output for terminal readability
 * - Request context support: Logger.info(req, "message")
 * - Error stack trace formatting
 * - Structured logging support
 * - Environment-based log level configuration
 *
 * @example
 * // Simple logging
 * Logger.info('Server started on port 8080');
 *
 * @example
 * // With request context
 * Logger.info(req, 'User authenticated', { userId: user.id });
 *
 * @example
 * // Error logging with stack traces
 * Logger.error('Database connection failed', error);
 */
export class Logger {
  private static currentLevel: LogLevel = Logger.resolveInitialLevel();
  private static useColors: boolean = process.stdout.isTTY ?? false;

  /** Programmatically override the active log level. */
  static setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /** Enable or disable colored output. */
  static setColorEnabled(enabled: boolean): void {
    this.useColors = enabled;
  }

  /** Logs low-level diagnostic information. */
  static debug(...args: LogArgs): void {
    this.log(LogLevel.DEBUG, args);
  }

  /** Logs high-level informational events. */
  static info(...args: LogArgs): void {
    this.log(LogLevel.INFO, args);
  }

  /** Logs notable warnings that aren't fatal. */
  static warn(...args: LogArgs): void {
    this.log(LogLevel.WARN, args);
  }

  /** Logs errors and exceptions. */
  static error(...args: LogArgs): void {
    this.log(LogLevel.ERROR, args);
  }

  /**
   * Type guard to check if a value is an Express Request object.
   * More robust than checking for 'method' property alone.
   */
  private static isExpressRequest(value: unknown): value is Request {
    return (
      value !== null &&
      typeof value === 'object' &&
      'method' in value &&
      'url' in value &&
      typeof (value as Request).method === 'string' &&
      typeof (value as Request).url === 'string'
    );
  }

  private static shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.currentLevel];
  }

  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const color = this.useColors ? COLORS[level] : '';
    const dimColor = this.useColors ? COLORS.DIM : '';
    const reset = this.useColors ? COLORS.RESET : '';

    return `${dimColor}[${timestamp}]${reset} ${color}[${level}]${reset} ${message}`;
  }

  private static formatRequestContext(httpRequest: Request): string {
    const method = httpRequest.method?.toUpperCase() || 'UNKNOWN';
    const path = httpRequest.originalUrl || httpRequest.url || '';
    return `[${method} ${path}]`;
  }

  /**
   * Formats arguments for output, handling special cases:
   * - Error objects: Includes stack trace
   * - Objects: Pretty-printed JSON
   */
  private static formatArgs(args: unknown[]): unknown[] {
    return args.map((arg) => {
      if (arg instanceof Error) {
        // Include full stack trace for errors
        return `${arg.message}\n${arg.stack || '(no stack trace)'}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        // Pretty-print objects for readability
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return arg;
    });
  }

  private static normalizeArgs(args: LogArgs): { message: string; args: unknown[] } {
    // Check if first argument is an Express Request object
    if (this.isExpressRequest(args[0])) {
      const [httpRequest, message, ...rest] = args as [Request, string, ...unknown[]];
      const context = this.formatRequestContext(httpRequest);
      return { message: `${context} ${message}`, args: rest };
    }

    // Standard logging without request context
    const [message, ...rest] = args as [string, ...unknown[]];
    return { message, args: rest };
  }

  private static resolveInitialLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();

    if (!envLevel) {
      return LogLevel.INFO;
    }

    // Validate environment variable value
    if (!(envLevel in LogLevel)) {
      const validLevels = Object.keys(LogLevel).join(', ');
      console.warn(
        `[Logger] Invalid LOG_LEVEL "${envLevel}". Valid values: ${validLevels}. Defaulting to INFO.`
      );
      return LogLevel.INFO;
    }

    return envLevel as LogLevel;
  }

  private static log(level: LogLevel, args: LogArgs): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const normalized = this.normalizeArgs(args);
    const formattedArgs = this.formatArgs(normalized.args);
    this.write(level, normalized.message, formattedArgs);
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
