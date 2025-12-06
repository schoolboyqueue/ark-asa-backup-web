/**
 * @fileoverview Streaming domain HTTP routes.
 * Handles real-time streaming endpoints using NDJSON format.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** HTTP streaming request/response handling
 * **Dependencies:** Streaming service, utilities
 * **Used By:** Express application
 *
 * **Note:** This is a placeholder for the full streaming implementation.
 * The original streamRoutes.ts has complex restore functionality that
 * should be migrated here with proper dependency injection.
 */

import { Router, Response } from 'express';
import Dockerode from 'dockerode';
import type { BackupConfig } from '../backup/service.js';
import * as streamingService from './service.js';
import { initializeStream, setupStreamCleanup } from '../../utils/httpStream.js';
import { Logger } from '../../utils/logger.js';

/**
 * Creates streaming routes with injected dependencies.
 *
 * @param client - Docker client
 * @param containerName - Container name
 * @param backupConfig - Backup configuration
 * @returns Express router with streaming endpoints
 */
export function createStreamingRoutes(
  client: Dockerode,
  containerName: string,
  backupConfig: BackupConfig
): Router {
  const router = Router();

  /**
   * GET /api/server/status/stream - Real-time server status stream
   */
  router.get('/api/server/status/stream', (_req, res: Response) => {
    const sendEvent = initializeStream(res);
    let isStreamActive = true;

    sendEvent('connected', { message: 'Status stream connected' });

    // Start polling in background without awaiting
    streamingService
      .pollServerStatus(
        client,
        containerName,
        (status) => {
          sendEvent('status', { ok: true, status });
        },
        () => isStreamActive
      )
      .catch((error) => {
        Logger.error('[Streaming] Server status polling error:', error);
        sendEvent('error', { message: 'Polling error' });
      });

    setupStreamCleanup(res, () => {
      isStreamActive = false;
      Logger.info('Server status stream client disconnected');
    });
  });

  /**
   * GET /api/backups/stream - Real-time backups list stream
   */
  router.get('/api/backups/stream', (_req, res: Response) => {
    const sendEvent = initializeStream(res);
    let isStreamActive = true;

    sendEvent('connected', { message: 'Backups stream connected' });

    // Start polling in background without awaiting
    streamingService
      .pollBackupsList(
        backupConfig,
        (backups) => {
          sendEvent('backups', { ok: true, backups });
        },
        () => isStreamActive
      )
      .catch((error) => {
        Logger.error('[Streaming] Backups polling error:', error);
        sendEvent('error', { message: 'Polling error' });
      });

    setupStreamCleanup(res, () => {
      isStreamActive = false;
      Logger.info('Backups stream client disconnected');
    });
  });

  return router;
}
