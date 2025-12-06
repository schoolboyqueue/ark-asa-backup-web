/**
 * @fileoverview Health domain business logic layer.
 * Implements health check operations.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Aggregate health status from various sources
 * **Dependencies:** Scheduler state, system monitoring
 * **Used By:** Routes
 */

import type { BackupHealthStatus, DiskSpace, VersionInfo } from '../../types/index.js';

/**
 * Gets backup system health status.
 *
 * **Why:** Provides comprehensive health information for monitoring.
 *
 * @param schedulerActive - Whether scheduler is running
 * @param lastSuccessfulBackupTime - Timestamp of last successful backup
 * @param lastFailedBackupTime - Timestamp of last failed backup
 * @param lastBackupError - Error message from last failed backup
 * @returns Health status object
 */
export function getBackupHealthStatus(
  schedulerActive: boolean,
  lastSuccessfulBackupTime: number | null,
  lastFailedBackupTime: number | null,
  lastBackupError: string | null
): BackupHealthStatus {
  return {
    ok: true,
    scheduler_active: schedulerActive,
    last_successful_backup: lastSuccessfulBackupTime,
    last_failed_backup: lastFailedBackupTime,
    last_error: lastBackupError,
  };
}

/**
 * Gets disk space information.
 *
 * **Why:** Helps users monitor available storage for backups.
 *
 * @param totalBytes - Total disk capacity
 * @param usedBytes - Used disk space
 * @param availableBytes - Available disk space
 * @returns Disk space status object
 */
export function getDiskSpaceStatus(
  totalBytes: number,
  usedBytes: number,
  availableBytes: number
): DiskSpace {
  const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

  return {
    ok: true,
    total_bytes: totalBytes,
    used_bytes: usedBytes,
    available_bytes: availableBytes,
    used_percent: usedPercent,
  };
}

/**
 * Gets version information.
 *
 * **Why:** Allows clients to verify they're compatible with the server.
 *
 * @param serverVersion - Server version string
 * @returns Version info object
 */
export function getVersionStatus(serverVersion: string): VersionInfo {
  return {
    server_version: serverVersion,
  };
}
