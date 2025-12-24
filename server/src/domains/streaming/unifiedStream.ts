/**
 * @fileoverview Unified streaming endpoint that multiplexes all streaming data sources.
 * Provides a single /api/stream endpoint that emits different event types.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** Multiplex multiple streaming sources into single endpoint
 * **Dependencies:** Streaming service, system service, scheduler service
 * **Used By:** Express application
 */

import type Dockerode from 'dockerode';
import { type Response, Router } from 'express';
import { initializeStream, setupStreamCleanup } from '../../utils/httpStream.js';
import { Logger } from '../../utils/logger.js';
import type { BackupConfig } from '../backup/service.js';
import * as schedulerService from '../scheduler/service.js';
import * as systemService from '../system/service.js';
import * as streamingService from './service.js';

/**
 * Creates unified streaming route that multiplexes all data sources.
 *
 * @param client - Docker client
 * @param containerName - Container name
 * @param backupConfig - Backup configuration
 * @param backupStorageDir - Backup storage directory for disk space calculation
 * @returns Express router with unified streaming endpoint
 */
export function createUnifiedStreamRoute(
  client: Dockerode,
  containerName: string,
  backupConfig: BackupConfig,
  backupStorageDir: string
): Router {
  const router = Router();

  /**
   * GET /api/stream - Unified streaming endpoint
   * Multiplexes server status, backups, disk space, backup health, and version info
   */
  router.get('/api/stream', (_req, res: Response) => {
    const sendEvent = initializeStream(res);
    let isStreamActive = true;

    sendEvent('connected', { message: 'Unified stream connected' });

    // Start polling server status
    streamingService
      .pollServerStatus(
        client,
        containerName,
        (status) => {
          sendEvent('server-status', { ok: true, status });
        },
        () => isStreamActive,
        (error) => {
          sendEvent('server-status-error', { ok: false, error: error.message });
        }
      )
      .catch((error) => {
        Logger.error('[Streaming] Server status polling error:', error);
        sendEvent('server-status-error', { ok: false, error: String(error) });
      });

    // Start polling backups list
    streamingService
      .pollBackupsList(
        backupConfig,
        (backups) => {
          sendEvent('backups', backups);
        },
        () => isStreamActive
      )
      .catch((error) => {
        Logger.error('[Streaming] Backups polling error:', error);
        sendEvent('backups-error', { ok: false, error: String(error) });
      });

    // Poll disk space info
    const diskSpaceInterval = setInterval(async () => {
      if (!isStreamActive) {
        clearInterval(diskSpaceInterval);
        return;
      }
      try {
        const diskSpace = await systemService.getDiskSpaceInfo(backupStorageDir);
        sendEvent('disk-space', diskSpace);
      } catch (error) {
        Logger.error('[Streaming] Disk space polling error:', error);
        sendEvent('disk-space-error', { ok: false, error: String(error) });
      }
    }, 5000);

    // Poll backup health info
    const healthInterval = setInterval(() => {
      if (!isStreamActive) {
        clearInterval(healthInterval);
        return;
      }
      try {
        const health = {
          ok: true,
          scheduler_active: schedulerService.isSchedulerActive(),
          last_successful_backup: schedulerService.getLastSuccessfulBackupTime(),
          last_failed_backup: schedulerService.getLastFailedBackupTime(),
          last_error: schedulerService.getLastBackupError(),
        };
        sendEvent('backup-health', health);
      } catch (error) {
        Logger.error('[Streaming] Backup health polling error:', error);
        sendEvent('backup-health-error', { ok: false, error: String(error) });
      }
    }, 5000);

    // Send version info once
    try {
      const version = systemService.getVersion();
      sendEvent('version', { server_version: version });
    } catch (error) {
      Logger.error('[Streaming] Version info error:', error);
    }

    setupStreamCleanup(res, () => {
      isStreamActive = false;
      clearInterval(diskSpaceInterval);
      clearInterval(healthInterval);
      Logger.info('Unified stream client disconnected');
    });
  });

  return router;
}
