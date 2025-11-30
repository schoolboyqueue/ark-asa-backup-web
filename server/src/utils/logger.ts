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
  static debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  /** Logs high-level informational events. */
  static info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  /** Logs notable warnings that aren’t fatal. */
  static warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  /** Logs errors and exceptions. */
  static error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }

  private static shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.currentLevel];
  }

  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private static resolveInitialLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel | undefined;
    return envLevel && envLevel in LogLevel ? envLevel : LogLevel.INFO;
  }
}
