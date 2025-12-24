/**
 * @fileoverview Error handling utilities for consistent error responses.
 * Provides error classes and middleware for standardized error handling across routes.
 *
 * Design Pattern: Custom error classes allow routes to throw domain-specific errors
 * that are caught by middleware and converted to appropriate HTTP responses.
 */

import type { NextFunction, Request, Response } from 'express';
import { Logger } from './logger.js';

/**
 * Base application error class.
 * Extends Error with HTTP status code and user-friendly message.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public originalError?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error for malformed requests.
 * Returns 400 Bad Request.
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error for missing resources.
 * Returns 404 Not Found.
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Server error for unexpected failures.
 * Returns 500 Internal Server Error.
 */
export class ServerError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(500, message, originalError);
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Express error handling middleware.
 * Catches errors thrown by route handlers and converts them to HTTP responses.
 * Must be registered AFTER all other middleware and routes.
 *
 * @param error - The error thrown by a route handler
 * @param _req - Express Request (unused but required for middleware signature)
 * @param res - Express Response
 * @param _next - Express NextFunction (unused but required for middleware signature)
 *
 * @example
 * app.use(errorHandler);
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError instances
  if (error instanceof AppError) {
    Logger.warn(`${error.statusCode} ${error.message}`, error.originalError);
    res.status(error.statusCode).json({
      ok: false,
      error: error.message,
    });
    return;
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    Logger.error('Unhandled error', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
    return;
  }

  // Handle unknown error types
  Logger.error('Unknown error type', error);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
  });
}

/**
 * Wraps async route handlers to catch errors and pass them to error middleware.
 * Eliminates the need for try-catch in every route handler.
 *
 * @param handler - Async route handler function
 * @returns Wrapped handler that catches errors
 *
 * @example
 * router.get('/api/data', asyncHandler(async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data);
 * }));
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
