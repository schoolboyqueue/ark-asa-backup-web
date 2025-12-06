/**
 * @fileoverview HTTP Streaming utility functions for ARK ASA Backup Manager.
 * Provides helpers for setting up and managing HTTP streams with clients using NDJSON format.
 */

import type { Response } from 'express';

// ============================================================================
// HTTP Stream Connection Tracking (for graceful shutdown)
// ============================================================================

/** Set of all active HTTP streaming connections */
const activeStreamConnections = new Set<Response>();

/**
 * Closes all active HTTP streaming connections.
 * Used during graceful shutdown to ensure HTTP server can close cleanly.
 */
export function closeAllStreamConnections(): void {
  for (const response of activeStreamConnections) {
    if (!response.writableEnded) {
      response.end();
    }
  }
  activeStreamConnections.clear();
}

// ============================================================================
// HTTP Stream Setup
// ============================================================================

/**
 * Configures HTTP response headers for streaming.
 * Sets appropriate content type, cache control, and connection settings.
 * Uses application/x-ndjson (newline-delimited JSON) for efficient streaming.
 *
 * @param {Response} httpResponse - Express response object
 */
export function setupStreamHeaders(httpResponse: Response): void {
  httpResponse.setHeader('Content-Type', 'application/x-ndjson');
  httpResponse.setHeader('Cache-Control', 'no-cache');
  httpResponse.setHeader('Connection', 'keep-alive');
  httpResponse.setHeader('X-Content-Type-Options', 'nosniff');
  httpResponse.flushHeaders();
}

/**
 * Sends a streaming event to the client using NDJSON format.
 * Each event is a JSON object with 'type' and 'data' fields, followed by a newline.
 *
 * @param {Response} httpResponse - Express response object
 * @param {string} eventType - The event type (e.g., 'status', 'error', 'progress')
 * @param {any} eventData - The event data payload
 */
export function sendStreamEvent(httpResponse: Response, eventType: string, eventData: any): void {
  const event = { type: eventType, data: eventData };
  httpResponse.write(JSON.stringify(event) + '\n');
}

/**
 * Creates a stream event sender function bound to a specific response.
 * Returns a function that can be called to send events without passing the response each time.
 *
 * @param {Response} httpResponse - Express response object
 * @returns {(eventType: string, eventData: any) => void} Event sender function
 */
export function createStreamEventSender(
  httpResponse: Response
): (eventType: string, eventData: any) => void {
  return (eventType: string, eventData: any): void => {
    sendStreamEvent(httpResponse, eventType, eventData);
  };
}

/**
 * Sets up cleanup handler for HTTP stream connection close events.
 * Useful for stopping polling loops and releasing resources when client disconnects.
 * Automatically tracks connection for graceful shutdown.
 *
 * @param {Response} httpResponse - Express response object
 * @param {() => void} cleanupHandler - Function to call when connection closes
 */
export function setupStreamCleanup(httpResponse: Response, cleanupHandler: () => void): void {
  // Track this connection for graceful shutdown
  activeStreamConnections.add(httpResponse);

  httpResponse.on('close', () => {
    // Remove from tracking when connection closes
    activeStreamConnections.delete(httpResponse);
    cleanupHandler();
  });
}

/**
 * Complete HTTP stream setup helper that combines header setup and event sender creation.
 * Returns a configured event sender function ready to use.
 *
 * @param {Response} httpResponse - Express response object
 * @returns {(eventType: string, eventData: any) => void} Event sender function
 */
export function initializeStream(
  httpResponse: Response
): (eventType: string, eventData: any) => void {
  setupStreamHeaders(httpResponse);
  return createStreamEventSender(httpResponse);
}
