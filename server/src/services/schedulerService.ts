/**
 * @fileoverview Background backup scheduler service for ARK ASA Backup Manager.
 * Manages automated backup loop with configurable intervals and state tracking.
 *
 * Design Pattern: Observer - Observes timer intervals and triggers backup operations
 */

import type { BackupSettings } from '../types/index.js';
import { loadBackupSettings } from './settingsService.js';
import { createBackup, pruneOldBackupArchives } from './backupService.js';
import { MINIMUM_LOOP_WAIT_MILLISECONDS } from '../config/constants.js';
import { Logger } from '../utils/logger.js';

// ============================================================================
// Scheduler State Management
// ============================================================================

/** Flag to control backup loop execution */
let isBackupLoopActive = false;

/** Timestamp of last successful backup (Unix timestamp in seconds) */
let lastSuccessfulBackupTime: number | null = null;

/** Timestamp of last failed backup (Unix timestamp in seconds) */
let lastFailedBackupTime: number | null = null;

/** Error message from last failed backup */
let lastBackupError: string | null = null;

// ============================================================================
// State Accessors
// ============================================================================

/**
 * Gets whether the backup scheduler loop is currently active.
 *
 * @returns {boolean} True if scheduler is running
 */
export function isSchedulerActive(): boolean {
  return isBackupLoopActive;
}

/**
 * Gets timestamp of last successful backup.
 *
 * @returns {number | null} Unix timestamp in seconds or null if no successful backups
 */
export function getLastSuccessfulBackupTime(): number | null {
  return lastSuccessfulBackupTime;
}

/**
 * Gets timestamp of last failed backup.
 *
 * @returns {number | null} Unix timestamp in seconds or null if no failed backups
 */
export function getLastFailedBackupTime(): number | null {
  return lastFailedBackupTime;
}

/**
 * Gets error message from last failed backup.
 *
 * @returns {string | null} Error message or null if no recent failures
 */
export function getLastBackupError(): string | null {
  return lastBackupError;
}

/**
 * Stops the backup scheduler loop.
 * Used during graceful shutdown.
 */
export function stopScheduler(): void {
  isBackupLoopActive = false;
  Logger.info('Backup scheduler loop stopping...');
}

// ============================================================================
// Backup Execution
// ============================================================================

/**
 * Executes a single backup operation and prunes old archives.
 * Updates health tracking state based on success/failure.
 *
 * @param {BackupSettings} currentSettings - Active backup configuration
 * @param {string} [notes] - Optional user-provided notes for this backup
 * @returns {Promise<number>} Backup interval in seconds to wait before next backup
 * @async
 */
export async function executeBackupAndPrune(
  currentSettings: BackupSettings,
  notes?: string
): Promise<number> {
  const backupIntervalSeconds = currentSettings.BACKUP_INTERVAL;
  const maximumBackupsToRetain = currentSettings.MAX_BACKUPS;

  try {
    // Create backup with optional notes
    await createBackup(currentSettings, notes);

    // Update health tracking - successful backup
    lastSuccessfulBackupTime = Math.floor(Date.now() / 1000);
    lastBackupError = null;

    // Remove old backups exceeding retention limit
    await pruneOldBackupArchives(maximumBackupsToRetain);
  } catch (backupError) {
    Logger.error('Backup operation failed:', backupError);

    // Update health tracking - failed backup
    lastFailedBackupTime = Math.floor(Date.now() / 1000);
    lastBackupError = backupError instanceof Error ? backupError.message : String(backupError);
  }

  return backupIntervalSeconds;
}

// ============================================================================
// Scheduler Loop
// ============================================================================

/**
 * Infinite background loop that executes backups on schedule.
 * Reloads configuration before each iteration to respect runtime changes.
 * Continues running until explicitly stopped via stopScheduler() or process signals.
 *
 * @returns {Promise<void>}
 * @async
 */
export async function runBackupSchedulerLoop(): Promise<void> {
  isBackupLoopActive = true;
  Logger.info('Backup scheduler loop started');

  while (isBackupLoopActive) {
    try {
      const currentSettings = await loadBackupSettings();
      const nextBackupIntervalSeconds = await executeBackupAndPrune(currentSettings);
      const waitTimeMilliseconds = Math.max(
        MINIMUM_LOOP_WAIT_MILLISECONDS,
        nextBackupIntervalSeconds * 1000
      );

      Logger.info(`Next backup scheduled in ${waitTimeMilliseconds / 1000} seconds`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, waitTimeMilliseconds));
    } catch (loopError) {
      Logger.error('Backup scheduler loop error:', loopError);
      // Wait before retrying to avoid rapid failure loops
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, MINIMUM_LOOP_WAIT_MILLISECONDS)
      );
    }
  }

  Logger.info('Backup scheduler loop stopped');
}
