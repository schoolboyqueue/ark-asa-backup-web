import type { Request } from 'express';

/**
 * @fileoverview
 * Application logger with structured output, request context support, and colored terminal output.
 * Provides consistent logging across the application with configurable log levels and formatting.
 *
 * Design Patterns:
 * - Singleton: Static class ensures single logging configuration across application
 * - Strategy: Log level filtering strategy via shouldLog()
 * - Template Method: log() orchestrates formatting and output steps
 */

/**
 * Type definition for logger arguments supporting two forms:
 * - Simple: [message, ...args]
 * - With request context: [Request, message, ...args]
 */
type LogArgs = [message: string, ...args: unknown[]] | [Request, string, ...unknown[]];

/**
 * Supported log levels for the application logger ordered by verbosity.
 * Levels are checked against LEVEL_PRIORITY to determine output eligibility.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Priority map used to determine whether a message should be emitted.
 * Higher priority levels (ERROR) will always be logged when lower levels (DEBUG) are active.
 */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * ANSI color codes for terminal output.
 * Colors are only applied when output is a TTY (interactive terminal).
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
 * - Colored output for terminal readability (auto-detects TTY)
 * - Request context support: Logger.info(req, "message")
 * - Error stack trace formatting
 * - Structured logging support (JSON formatting for objects)
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
 *
 * @example
 * // Configure log level programmatically
 * Logger.setLogLevel(LogLevel.DEBUG);
 *
 * @example
 * // Disable colors for non-TTY environments
 * Logger.setColorEnabled(false);
 */
export class Logger {
  /** Current active log level, defaults to INFO or LOG_LEVEL env variable */
  private static currentLevel: LogLevel = Logger.resolveInitialLevel();

  /** Whether to use ANSI color codes in output, auto-detected from TTY */
  private static useColors: boolean = process.stdout.isTTY ?? false;

  /**
   * Programmatically override the active log level.
   * Messages below this level will be filtered out.
   *
   * @param level - The minimum log level to output
   *
   * @example
   * Logger.setLogLevel(LogLevel.DEBUG); // Show all messages including debug
   * Logger.setLogLevel(LogLevel.ERROR); // Only show errors
   */
  static setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Enable or disable colored output.
   * Useful for non-TTY environments or when piping logs to files.
   *
   * @param enabled - Whether to use ANSI color codes
   *
   * @example
   * Logger.setColorEnabled(false); // Disable colors for log file output
   */
  static setColorEnabled(enabled: boolean): void {
    this.useColors = enabled;
  }

  /**
   * Logs low-level diagnostic information.
   * Only visible when log level is set to DEBUG.
   *
   * @param args - Message and optional arguments, or Request + message + arguments
   *
   * @example
   * Logger.debug('Cache hit for key', cacheKey);
   * Logger.debug(req, 'Processing request body', req.body);
   */
  static debug(...args: LogArgs): void {
    this.log(LogLevel.DEBUG, args);
  }

  /**
   * Logs high-level informational events.
   * Default log level, visible in INFO, WARN, and ERROR modes.
   *
   * @param args - Message and optional arguments, or Request + message + arguments
   *
   * @example
   * Logger.info('Server started on port 8080');
   * Logger.info(req, 'User authenticated successfully', { userId: user.id });
   */
  static info(...args: LogArgs): void {
    this.log(LogLevel.INFO, args);
  }

  /**
   * Logs notable warnings that aren't fatal.
   * Visible in WARN and ERROR modes.
   *
   * @param args - Message and optional arguments, or Request + message + arguments
   *
   * @example
   * Logger.warn('Deprecated API endpoint called');
   * Logger.warn(req, 'Rate limit approaching', { remaining: 10 });
   */
  static warn(...args: LogArgs): void {
    this.log(LogLevel.WARN, args);
  }

  /**
   * Logs errors and exceptions.
   * Always visible regardless of log level.
   * Automatically includes full stack traces for Error objects.
   *
   * @param args - Message and optional arguments (including Error objects), or Request + message + arguments
   *
   * @example
   * Logger.error('Database connection failed', error);
   * Logger.error(req, 'Authentication failed', { reason: 'Invalid token' });
   */
  static error(...args: LogArgs): void {
    this.log(LogLevel.ERROR, args);
  }

  /**
   * Type guard to check if a value is an Express Request object.
   * More robust than checking for 'method' property alone to prevent false positives.
   *
   * @param value - Value to check
   * @returns True if value is an Express Request object
   *
   * @example
   * if (Logger.isExpressRequest(args[0])) {
   *   // Handle request context logging
   * }
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

  /**
   * Determines if a log message should be emitted based on current log level.
   * Uses priority comparison: higher priority levels are always logged when lower levels are active.
   *
   * @param level - The log level of the message
   * @returns True if message should be logged
   *
   * @example
   * // If currentLevel is INFO:
   * shouldLog(DEBUG) -> false
   * shouldLog(INFO)  -> true
   * shouldLog(ERROR) -> true
   */
  private static shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.currentLevel];
  }

  /**
   * Formats a log message with timestamp, level, and optional colors.
   * Applies ANSI color codes when colors are enabled.
   *
   * @param level - The log level for color selection
   * @param message - The message to format
   * @returns Formatted message string with timestamp and level prefix
   *
   * @example
   * formatMessage(LogLevel.INFO, 'Server started')
   * // Output: "[2025-11-30T12:00:00.000Z] [INFO] Server started"
   */
  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const color = this.useColors ? COLORS[level] : '';
    const dimColor = this.useColors ? COLORS.DIM : '';
    const reset = this.useColors ? COLORS.RESET : '';

    return `${dimColor}[${timestamp}]${reset} ${color}[${level}]${reset} ${message}`;
  }

  /**
   * Extracts and formats HTTP request context for logging.
   * Includes HTTP method and request path.
   *
   * @param httpRequest - Express Request object
   * @returns Formatted request context string
   *
   * @example
   * formatRequestContext(req)
   * // Output: "[GET /api/users]"
   */
  private static formatRequestContext(httpRequest: Request): string {
    const method = httpRequest.method?.toUpperCase() || 'UNKNOWN';
    const path = httpRequest.originalUrl || httpRequest.url || '';
    return `[${method} ${path}]`;
  }

  /**
   * Formats arguments for output, handling special cases.
   * - Error objects: Includes full stack trace
   * - Objects: Pretty-printed JSON with 2-space indentation
   * - Primitives: Passed through unchanged
   *
   * @param args - Array of arguments to format
   * @returns Formatted arguments array
   *
   * @example
   * formatArgs([new Error('Failed'), { userId: 123 }])
   * // Output: ["Failed\n  at ...", "{\n  \"userId\": 123\n}"]
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
          // Fallback for non-serializable objects (circular refs, etc.)
          return `[${Object.prototype.toString.call(arg)}]`;
        }
      }
      return arg;
    });
  }

  /**
   * Normalizes log arguments into a consistent format.
   * Detects and extracts request context if present as first argument.
   *
   * @param args - Raw log arguments (message or Request + message)
   * @returns Normalized object with message and args array
   *
   * @example
   * normalizeArgs(['Server started', 8080])
   * // Output: { message: 'Server started', args: [8080] }
   *
   * @example
   * normalizeArgs([req, 'User login', { userId: 123 }])
   * // Output: { message: '[GET /api/login] User login', args: [{ userId: 123 }] }
   */
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

  /**
   * Resolves the initial log level from environment variables.
   * Reads LOG_LEVEL env var and validates against supported levels.
   * Logs a warning and defaults to INFO if value is invalid.
   *
   * @returns Validated log level
   *
   * @example
   * // LOG_LEVEL=DEBUG -> LogLevel.DEBUG
   * // LOG_LEVEL=INVALID -> LogLevel.INFO (with warning)
   * // LOG_LEVEL not set -> LogLevel.INFO
   */
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

  /**
   * Core logging orchestration method.
   * Filters by log level, normalizes arguments, and delegates to write().
   * Template method that coordinates the logging pipeline.
   *
   * @param level - The log level for this message
   * @param args - Raw log arguments
   *
   * @example
   * log(LogLevel.INFO, ['Server started', { port: 8080 }])
   */
  private static log(level: LogLevel, args: LogArgs): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const normalized = this.normalizeArgs(args);
    const formattedArgs = this.formatArgs(normalized.args);
    this.write(level, normalized.message, formattedArgs);
  }

  /**
   * Writes formatted log message to console.
   * Routes to appropriate console method (log/info/warn/error) based on level.
   *
   * @param level - The log level determining console method
   * @param message - Formatted message string
   * @param args - Formatted arguments to append
   *
   * @example
   * write(LogLevel.ERROR, '[2025-11-30] [ERROR] Failed', ['Connection timeout'])
   * // Calls: console.error('[2025-11-30] [ERROR] Failed', 'Connection timeout')
   */
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
