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
healthRouter.get('/health', (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');
  httpResponse.status(200).send('OK');
  Logger.info(httpRequest, 'Response sent');
});

/**
 * Backup system health status endpoint.
 * Returns scheduler status and backup success/failure information.
 * @route GET /api/backup/health
 */
healthRouter.get('/api/backup/health', (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');
  const healthStatus = getBackupHealthStatus(
    isSchedulerActive(),
    getLastSuccessfulBackupTime(),
    getLastFailedBackupTime(),
    getLastBackupError()
  );

  Logger.info(httpRequest, 'Health status', healthStatus);
  httpResponse.json(healthStatus);
  Logger.info(httpRequest, 'Response sent');
});

export default healthRouter;
