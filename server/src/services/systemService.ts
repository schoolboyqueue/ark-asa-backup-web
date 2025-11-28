/**
 * @fileoverview System utilities service for ARK ASA Backup Manager.
 * Handles disk space monitoring and backup health status checks.
 */

import { promises as fs } from 'fs';
import type { DiskSpace, BackupHealthStatus } from '../types/index.js';
import { BACKUP_STORAGE_DIRECTORY } from '../config/constants.js';

// ============================================================================
// Disk Space Monitoring
// ============================================================================

/**
 * Retrieves disk space information for the backup storage directory.
 * Returns filesystem statistics including total, used, and available space.
 *
 * @returns {Promise<DiskSpace>} Disk space statistics
 * @async
 */
export async function retrieveDiskSpaceInfo(): Promise<DiskSpace> {
  try {
    const diskSpaceStats = await fs.statfs(BACKUP_STORAGE_DIRECTORY);
    const totalBytes = diskSpaceStats.blocks * diskSpaceStats.bsize;
    const freeBytes = diskSpaceStats.bfree * diskSpaceStats.bsize;
    const availableBytes = diskSpaceStats.bavail * diskSpaceStats.bsize;
    const usedBytes = totalBytes - freeBytes;

    return {
      ok: true,
      total_bytes: totalBytes,
      used_bytes: usedBytes,
      available_bytes: availableBytes,
      used_percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
    };
  } catch (diskSpaceError) {
    const errorMessage =
      diskSpaceError instanceof Error ? diskSpaceError.message : String(diskSpaceError);

    return {
      ok: false,
      total_bytes: 0,
      used_bytes: 0,
      available_bytes: 0,
      used_percent: 0,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Health Status Monitoring
// ============================================================================

/**
 * Generates backup system health status report.
 * Aggregates scheduler state and backup success/failure tracking.
 *
 * @param {boolean} schedulerActive - Whether the backup scheduler loop is currently running
 * @param {number | null} lastSuccessfulBackup - Unix timestamp of last successful backup
 * @param {number | null} lastFailedBackup - Unix timestamp of last failed backup
 * @param {string | null} lastError - Error message from last failed backup
 * @returns {BackupHealthStatus} Health status object
 */
export function getBackupHealthStatus(
  schedulerActive: boolean,
  lastSuccessfulBackup: number | null,
  lastFailedBackup: number | null,
  lastError: string | null
): BackupHealthStatus {
  return {
    ok: true,
    scheduler_active: schedulerActive,
    last_successful_backup: lastSuccessfulBackup,
    last_failed_backup: lastFailedBackup,
    last_error: lastError,
  };
}
