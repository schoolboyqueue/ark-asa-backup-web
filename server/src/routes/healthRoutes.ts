/**
 * @fileoverview Health check routes for ARK ASA Backup Manager.
 * Provides basic health check and backup system health status endpoints.
 */

import { Router, Request, Response } from 'express';
import { getBackupHealthStatus } from '../services/systemService.js';
import {
  isSchedulerActive,
  getLastSuccessfulBackupTime,
  getLastFailedBackupTime,
  getLastBackupError,
} from '../services/schedulerService.js';
import { Logger } from '../utils/logger.js';

const healthRouter = Router();

// ============================================================================
// Health Check Routes
// ============================================================================

/**
 * Basic health check endpoint for monitoring.
 * @route GET /health
 */
healthRouter.get('/health', (_httpRequest: Request, httpResponse: Response) => {
  Logger.info('[GET /health] Request received');
  httpResponse.status(200).send('OK');
  Logger.info('[GET /health] Response sent');
});

/**
 * Backup system health status endpoint.
 * Returns scheduler status and backup success/failure information.
 * @route GET /api/backup/health
 */
healthRouter.get('/api/backup/health', (_httpRequest: Request, httpResponse: Response) => {
  Logger.info('[GET /api/backup/health] Request received');
  const healthStatus = getBackupHealthStatus(
    isSchedulerActive(),
    getLastSuccessfulBackupTime(),
    getLastFailedBackupTime(),
    getLastBackupError()
  );

  Logger.info('[GET /api/backup/health] Health status:', healthStatus);
  httpResponse.json(healthStatus);
  Logger.info('[GET /api/backup/health] Response sent');
});

export default healthRouter;
