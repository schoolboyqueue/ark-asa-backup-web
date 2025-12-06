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
import { asyncHandler, NotFoundError } from '../utils/errorHandler.js';

const serverRouter = Router();

// ============================================================================
// Server Control Routes
// ============================================================================

/**
 * Retrieves current ARK server container status.
 * Returns the effective status which combines Docker state with transitional states.
 * @route GET /api/server/status
 */
serverRouter.get(
  '/api/server/status',
  asyncHandler(async (_httpRequest: Request, httpResponse: Response) => {
    const containerStatus = await getContainerStatus();

    if (!containerStatus) {
      throw new NotFoundError(`container '${ARK_SERVER_CONTAINER_NAME}' not found`);
    }

    // Apply transitional state if applicable
    const effectiveStatus = getEffectiveServerStatus(containerStatus);
    httpResponse.json({ ok: true, status: effectiveStatus });
  })
);

/**
 * Starts the ARK server Docker container.
 * Sets transitional 'starting' state before operation and clears it after.
 * @route POST /api/server/start
 */
serverRouter.post(
  '/api/server/start',
  asyncHandler(async (_httpRequest: Request, httpResponse: Response) => {
    // Set transitional state BEFORE starting - SSE will pick this up immediately
    setServerStarting();

    try {
      const containerStatus = await startContainer();
      // Clear transitional state now that operation is complete
      clearTransitionalState();
      httpResponse.json({ ok: true, status: containerStatus });
    } catch (startError) {
      // Clear transitional state on error
      clearTransitionalState();

      if ((startError as Error).message.includes('not found')) {
        throw new NotFoundError(`container '${ARK_SERVER_CONTAINER_NAME}' not found`);
      }
      throw startError;
    }
  })
);

/**
 * Stops the ARK server Docker container with graceful shutdown timeout.
 * Sets transitional 'stopping' state before operation and clears it after.
 * @route POST /api/server/stop
 */
serverRouter.post(
  '/api/server/stop',
  asyncHandler(async (_httpRequest: Request, httpResponse: Response) => {
    // Set transitional state BEFORE stopping - SSE will pick this up immediately
    setServerStopping();

    try {
      const containerStatus = await stopContainer();
      // Clear transitional state now that operation is complete
      clearTransitionalState();
      httpResponse.json({ ok: true, status: containerStatus });
    } catch (stopError) {
      // Clear transitional state on error
      clearTransitionalState();

      if ((stopError as Error).message.includes('not found')) {
        throw new NotFoundError(`container '${ARK_SERVER_CONTAINER_NAME}' not found`);
      }
      throw stopError;
    }
  })
);

export default serverRouter;
