/**
 * @fileoverview Streaming domain business logic layer.
 * Implements real-time data streaming operations.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Coordinate streaming data from various sources
 * **Dependencies:** Backup service, server service, health service, system service
 * **Used By:** Streaming routes
 *
 * **Design:** Provides functions to poll and stream various data sources.
 */

import Dockerode from 'dockerode';
import type { BackupConfig } from '../backup/service.js';
import * as backupService from '../backup/service.js';
import * as arkServerService from '../arkServer/service.js';
import { Logger } from '../../utils/logger.js';

/**
 * Polls server status and yields updates when status changes.
 *
 * **Why:** Provides real-time server status updates to clients.
 *
 * @param client - Docker client
 * @param containerName - Container name
 * @param onStatusChange - Callback when status changes
 * @param isActive - Function to check if polling should continue
 * @param onError - Optional callback when polling fails
 */
export async function pollServerStatus(
  client: Dockerode,
  containerName: string,
  onStatusChange: (status: string) => void,
  isActive: () => boolean,
  onError?: (error: Error) => void
): Promise<void> {
  let previousStatus: string | null = null;

  while (isActive()) {
    try {
      const status = await arkServerService.getStatus(client, containerName);
      const effectiveStatus = arkServerService.getEffectiveServerStatus(status);

      if (effectiveStatus !== previousStatus) {
        onStatusChange(effectiveStatus);
        previousStatus = effectiveStatus;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      Logger.error('[Streaming] Error polling server status:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Polls backup list and yields updates when list changes.
 *
 * **Why:** Provides real-time backup list updates to clients.
 *
 * @param backupConfig - Backup configuration
 * @param onBackupsChange - Callback when backups change
 * @param isActive - Function to check if polling should continue
 */
export async function pollBackupsList(
  backupConfig: BackupConfig,
  onBackupsChange: (backups: unknown[]) => void,
  isActive: () => boolean
): Promise<void> {
  let previousBackupCount = 0;

  while (isActive()) {
    try {
      const backups = await backupService.listBackups(backupConfig);

      if (backups.length !== previousBackupCount) {
        onBackupsChange(backups);
        previousBackupCount = backups.length;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      Logger.error('[Streaming] Error polling backups list:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Polls health status and yields updates when status changes.
 *
 * **Why:** Provides real-time health monitoring to clients.
 *
 * @param _onHealthChange - Callback when health status changes (placeholder)
 * @param _isActive - Function to check if polling should continue (placeholder)
 */
export async function pollHealthStatus(
  _onHealthChange: (health: unknown) => void,
  _isActive: () => boolean
): Promise<void> {
  while (_isActive()) {
    try {
      // Health status would be computed from scheduler state
      // This is a placeholder for the actual implementation
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      Logger.error('[Streaming] Error polling health status:', error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
