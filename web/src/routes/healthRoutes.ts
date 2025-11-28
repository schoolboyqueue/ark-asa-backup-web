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

const healthRouter = Router();

// ============================================================================
// Health Check Routes
// ============================================================================

/**
 * Basic health check endpoint for monitoring.
 * @route GET /health
 */
healthRouter.get('/health', (_httpRequest: Request, httpResponse: Response) => {
  httpResponse.status(200).send('OK');
});

/**
 * Backup system health status endpoint.
 * Returns scheduler status and backup success/failure information.
 * @route GET /api/backup/health
 */
healthRouter.get('/api/backup/health', (_httpRequest: Request, httpResponse: Response) => {
  const healthStatus = getBackupHealthStatus(
    isSchedulerActive(),
    getLastSuccessfulBackupTime(),
    getLastFailedBackupTime(),
    getLastBackupError()
  );

  httpResponse.json(healthStatus);
});

export default healthRouter;
