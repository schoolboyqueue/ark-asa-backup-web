/**
 * @fileoverview ARK Server domain HTTP routes.
 * Handles ARK server control endpoints.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** Request/response handling
 * **Dependencies:** ARK server service, error handling
 * **Used By:** Express application
 */

import { Router, Request, Response } from 'express';
import Dockerode from 'dockerode';
import type { DockerConfig } from './repository.js';
import * as arkServerService from './service.js';
import { asyncHandler, NotFoundError } from '../../utils/errorHandler.js';

/**
 * Creates ARK server routes with injected dependencies.
 *
 * @param client - Docker client
 * @param config - Docker configuration
 * @returns Express router with server endpoints
 */
export function createArkServerRoutes(client: Dockerode, config: DockerConfig): Router {
  const router = Router();

  /**
   * GET /api/server/status - Get server status
   */
  router.get(
    '/api/server/status',
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const status = await arkServerService.getStatus(client, config.containerName);
        const effectiveStatus = arkServerService.getEffectiveServerStatus(status);
        res.json({ ok: true, status: effectiveStatus });
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError(`container '${config.containerName}' not found`);
        }
        throw error;
      }
    })
  );

  /**
   * POST /api/server/start - Start server
   */
  router.post(
    '/api/server/start',
    asyncHandler(async (_req: Request, res: Response) => {
      // Set transitional state before starting
      arkServerService.setServerStarting();

      try {
        const status = await arkServerService.start(client, config.containerName);
        arkServerService.clearTransitionalState();
        res.json({ ok: true, status });
      } catch (error) {
        arkServerService.clearTransitionalState();

        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError(`container '${config.containerName}' not found`);
        }
        throw error;
      }
    })
  );

  /**
   * POST /api/server/stop - Stop server
   */
  router.post(
    '/api/server/stop',
    asyncHandler(async (_req: Request, res: Response) => {
      // Set transitional state before stopping
      arkServerService.setServerStopping();

      try {
        const status = await arkServerService.stop(client, config);
        arkServerService.clearTransitionalState();
        res.json({ ok: true, status });
      } catch (error) {
        arkServerService.clearTransitionalState();

        if ((error as Error).message.includes('not found')) {
          throw new NotFoundError(`container '${config.containerName}' not found`);
        }
        throw error;
      }
    })
  );

  return router;
}
