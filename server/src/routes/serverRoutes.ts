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
  console.log('[GET /api/server/status] Request received');
  try {
    const containerStatus = await getContainerStatus();
    console.log('[GET /api/server/status] Container status:', containerStatus);

    if (!containerStatus) {
      console.log('[GET /api/server/status] Container not found');
      httpResponse.status(404).json({
        ok: false,
        error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
      });
      return;
    }

    httpResponse.json({ ok: true, status: containerStatus });
    console.log('[GET /api/server/status] Response sent successfully');
  } catch (statusError) {
    console.error('[GET /api/server/status] Error:', statusError);
    httpResponse.status(500).json({ ok: false, error: String(statusError) });
  }
});

/**
 * Starts the ARK server Docker container.
 * @route POST /api/server/start
 */
serverRouter.post('/api/server/start', async (_httpRequest: Request, httpResponse: Response) => {
  console.log('[POST /api/server/start] Request received');
  try {
    console.log('[POST /api/server/start] Starting container...');
    const containerStatus = await startContainer();
    console.log('[POST /api/server/start] Container started:', containerStatus);
    httpResponse.json({ ok: true, status: containerStatus });
    console.log('[POST /api/server/start] Response sent successfully');
  } catch (startError) {
    console.error('[POST /api/server/start] Error:', startError);
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
  console.log('[POST /api/server/stop] Request received');
  try {
    console.log('[POST /api/server/stop] Stopping container...');
    const containerStatus = await stopContainer();
    console.log('[POST /api/server/stop] Container stopped:', containerStatus);
    httpResponse.json({ ok: true, status: containerStatus });
    console.log('[POST /api/server/stop] Response sent successfully');
  } catch (stopError) {
    console.error('[POST /api/server/stop] Error:', stopError);
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
