/**
 * @fileoverview Docker server control routes for ARK ASA Backup Manager.
 * Handles ARK server container start, stop, and status operations.
 */

import { Router, Request, Response } from 'express';
import { startContainer, stopContainer, getContainerStatus } from '../services/dockerService.js';
import { ARK_SERVER_CONTAINER_NAME } from '../config/constants.js';

const serverRouter = Router();

// ============================================================================
// Server Control Routes
// ============================================================================

/**
 * Retrieves current ARK server container status.
 * @route GET /api/server/status
 */
serverRouter.get('/api/server/status', async (_httpRequest: Request, httpResponse: Response) => {
  try {
    const containerStatus = await getContainerStatus();

    if (!containerStatus) {
      httpResponse.status(404).json({
        ok: false,
        error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
      });
      return;
    }

    httpResponse.json({ ok: true, status: containerStatus });
  } catch (statusError) {
    httpResponse.status(500).json({ ok: false, error: String(statusError) });
  }
});

/**
 * Starts the ARK server Docker container.
 * @route POST /api/server/start
 */
serverRouter.post('/api/server/start', async (_httpRequest: Request, httpResponse: Response) => {
  try {
    const containerStatus = await startContainer();
    httpResponse.json({ ok: true, status: containerStatus });
  } catch (startError) {
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
 * @route POST /api/server/stop
 */
serverRouter.post('/api/server/stop', async (_httpRequest: Request, httpResponse: Response) => {
  try {
    const containerStatus = await stopContainer();
    httpResponse.json({ ok: true, status: containerStatus });
  } catch (stopError) {
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
