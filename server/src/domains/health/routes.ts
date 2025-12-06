/**
 * @fileoverview Health domain HTTP routes.
 * Handles health check and monitoring endpoints.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** Request/response handling
 * **Dependencies:** Health service, scheduler state, system monitoring
 * **Used By:** Express application
 */

import { Router, Request, Response } from 'express';
import * as healthService from './service.js';
import { asyncHandler } from '../../utils/errorHandler.js';

/**
 * Creates health routes with injected dependencies.
 *
 * @param schedulerState - Functions to get scheduler state
 * @param systemMonitoring - Functions to get system info
 * @returns Express router with health endpoints
 */
export function createHealthRoutes(
  schedulerState: {
    isActive: () => boolean;
    getLastSuccessfulTime: () => number | null;
    getLastFailedTime: () => number | null;
    getLastError: () => string | null;
  },
  systemMonitoring: {
    getDiskSpace: () => Promise<{ total: number; used: number; available: number }>;
    getVersion: () => string;
  }
): Router {
  const router = Router();

  /**
   * GET /health - Basic health check
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  /**
   * GET /api/backup/health - Backup system health status
   */
  router.get(
    '/api/backup/health',
    asyncHandler(async (_req: Request, res: Response) => {
      const status = healthService.getBackupHealthStatus(
        schedulerState.isActive(),
        schedulerState.getLastSuccessfulTime(),
        schedulerState.getLastFailedTime(),
        schedulerState.getLastError()
      );

      res.json(status);
    })
  );

  /**
   * GET /api/system/disk - Disk space information
   */
  router.get(
    '/api/system/disk',
    asyncHandler(async (_req: Request, res: Response) => {
      const diskInfo = await systemMonitoring.getDiskSpace();
      const status = healthService.getDiskSpaceStatus(
        diskInfo.total,
        diskInfo.used,
        diskInfo.available
      );

      res.json(status);
    })
  );

  /**
   * GET /api/system/version - Application version
   */
  router.get('/api/system/version', (_req: Request, res: Response) => {
    const status = healthService.getVersionStatus(systemMonitoring.getVersion());
    res.json(status);
  });

  return router;
}
