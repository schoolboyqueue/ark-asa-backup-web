/**
 * @fileoverview Server-Sent Events (SSE) utility functions for ARK ASA Backup Manager.
 * Provides helpers for setting up and managing SSE streams with clients.
 */

import type { Response } from 'express';

// ============================================================================
// SSE Stream Setup
// ============================================================================

/**
 * Configures HTTP response headers for Server-Sent Events streaming.
 * Sets appropriate content type, cache control, and connection settings.
 *
 * @param {Response} httpResponse - Express response object
 */
export function setupSSEHeaders(httpResponse: Response): void {
  httpResponse.setHeader('Content-Type', 'text/event-stream');
  httpResponse.setHeader('Cache-Control', 'no-cache');
  httpResponse.setHeader('Connection', 'keep-alive');
  httpResponse.flushHeaders();
}

/**
 * Sends a Server-Sent Event to the client.
 * Formats the event according to SSE protocol specification.
 *
 * @param {Response} httpResponse - Express response object
 * @param {string} eventType - The event type (e.g., 'status', 'error', 'progress')
 * @param {any} eventData - The event data payload
 */
export function sendSSEEvent(
  httpResponse: Response,
  eventType: string,
  eventData: any
): void {
  httpResponse.write(`event: ${eventType}\n`);
  httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
}

/**
 * Creates an SSE event sender function bound to a specific response.
 * Returns a function that can be called to send events without passing the response each time.
 *
 * @param {Response} httpResponse - Express response object
 * @returns {(eventType: string, eventData: any) => void} Event sender function
 */
export function createSSEEventSender(
  httpResponse: Response
): (eventType: string, eventData: any) => void {
  return (eventType: string, eventData: any): void => {
    sendSSEEvent(httpResponse, eventType, eventData);
  };
}

/**
 * Sets up cleanup handler for SSE connection close events.
 * Useful for stopping polling loops and releasing resources when client disconnects.
 *
 * @param {Response} httpResponse - Express response object
 * @param {() => void} cleanupHandler - Function to call when connection closes
 */
export function setupSSECleanup(httpResponse: Response, cleanupHandler: () => void): void {
  httpResponse.on('close', cleanupHandler);
}

/**
 * Complete SSE stream setup helper that combines header setup and event sender creation.
 * Returns a configured event sender function ready to use.
 *
 * @param {Response} httpResponse - Express response object
 * @returns {(eventType: string, eventData: any) => void} Event sender function
 */
export function initializeSSEStream(
  httpResponse: Response
): (eventType: string, eventData: any) => void {
  setupSSEHeaders(httpResponse);
  return createSSEEventSender(httpResponse);
}
