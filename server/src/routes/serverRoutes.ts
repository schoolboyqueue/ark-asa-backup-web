/**
 * @fileoverview Docker server control routes for ARK ASA Backup Manager.
 * Handles ARK server container start, stop, and status operations.
 */

import { Router, Request, Response } from 'express';
import { startContainer, stopContainer, getContainerStatus } from '../services/dockerService.js';
import {
  setServerStarting,
  setServerStopping,
  clearTransitionalState,
  getEffectiveServerStatus,
} from '../services/serverStateService.js';
import { ARK_SERVER_CONTAINER_NAME } from '../config/constants.js';
import { Logger } from '../utils/logger.js';

const serverRouter = Router();

// ============================================================================
// Server Control Routes
// ============================================================================

/**
 * Retrieves current ARK server container status.
 * Returns the effective status which combines Docker state with transitional states.
 * @route GET /api/server/status
 */
serverRouter.get('/api/server/status', async (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');
  try {
    const containerStatus = await getContainerStatus();
    Logger.info(httpRequest, 'Container status', containerStatus);

    if (!containerStatus) {
      Logger.info(httpRequest, 'Container not found');
      httpResponse.status(404).json({
        ok: false,
        error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
      });
      return;
    }

    // Apply transitional state if applicable
    const effectiveStatus = getEffectiveServerStatus(containerStatus);
    httpResponse.json({ ok: true, status: effectiveStatus });
    Logger.info(httpRequest, 'Response sent successfully', effectiveStatus);
  } catch (statusError) {
    Logger.error(httpRequest, 'Error', statusError);
    httpResponse.status(500).json({ ok: false, error: String(statusError) });
  }
});

/**
 * Starts the ARK server Docker container.
 * Sets transitional 'starting' state before operation and clears it after.
 * @route POST /api/server/start
 */
serverRouter.post('/api/server/start', async (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');

  // Set transitional state BEFORE starting - SSE will pick this up immediately
  setServerStarting();

  try {
    Logger.info(httpRequest, 'Starting container...');
    const containerStatus = await startContainer();
    Logger.info(httpRequest, 'Container started', containerStatus);

    // Clear transitional state now that operation is complete
    clearTransitionalState();

    httpResponse.json({ ok: true, status: containerStatus });
    Logger.info(httpRequest, 'Response sent successfully');
  } catch (startError) {
    // Clear transitional state on error
    clearTransitionalState();

    Logger.error(httpRequest, 'Error', startError);
    if ((startError as Error).message.includes('not found')) {
      httpResponse.status(404).json({
        ok: false,
        error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
      });
    } else {
      httpResponse.status(500).json({ ok: false, error: String(startError) });
    }
  }
});

/**
 * Stops the ARK server Docker container with graceful shutdown timeout.
 * Sets transitional 'stopping' state before operation and clears it after.
 * @route POST /api/server/stop
 */
serverRouter.post('/api/server/stop', async (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');

  // Set transitional state BEFORE stopping - SSE will pick this up immediately
  setServerStopping();

  try {
    Logger.info(httpRequest, 'Stopping container...');
    const containerStatus = await stopContainer();
    Logger.info(httpRequest, 'Container stopped', containerStatus);

    // Clear transitional state now that operation is complete
    clearTransitionalState();

    httpResponse.json({ ok: true, status: containerStatus });
    Logger.info(httpRequest, 'Response sent successfully');
  } catch (stopError) {
    // Clear transitional state on error
    clearTransitionalState();

    Logger.error(httpRequest, 'Error', stopError);
    if ((stopError as Error).message.includes('not found')) {
      httpResponse.status(404).json({
        ok: false,
        error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
      });
    } else {
      httpResponse.status(500).json({ ok: false, error: String(stopError) });
    }
  }
});

export default serverRouter;
