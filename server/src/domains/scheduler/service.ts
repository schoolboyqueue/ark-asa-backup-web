/**
 * @fileoverview Scheduler domain business logic layer.
 * Implements background backup scheduling.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Automated backup scheduling and state tracking
 * **Dependencies:** Backup service, settings service
 * **Used By:** Server entry point
 *
 * **Design:** Module-level state tracks scheduler status for health monitoring.
 */

import type { BackupSettings } from '../backup/types.js';
import type { BackupConfig } from '../backup/service.js';
import * as backupService from '../backup/service.js';
import * as settingsService from '../settings/service.js';
import type { SettingsConfig } from '../settings/service.js';
import { Logger } from '../../utils/logger.js';

const MINIMUM_LOOP_WAIT_MS = 60000;

let isBackupLoopActive = false;
let lastSuccessfulBackupTime: number | null = null;
let lastFailedBackupTime: number | null = null;
let lastBackupError: string | null = null;

/**
 * Gets whether scheduler is active.
 */
export function isSchedulerActive(): boolean {
  return isBackupLoopActive;
}

/**
 * Gets timestamp of last successful backup.
 */
export function getLastSuccessfulBackupTime(): number | null {
  return lastSuccessfulBackupTime;
}

/**
 * Gets timestamp of last failed backup.
 */
export function getLastFailedBackupTime(): number | null {
  return lastFailedBackupTime;
}

/**
 * Gets error message from last failed backup.
 */
export function getLastBackupError(): string | null {
  return lastBackupError;
}

/**
 * Runs the automated backup scheduler loop.
 *
 * **Why:** Provides automated backup creation at configured intervals.
 *
 * @param backupConfig - Backup configuration
 * @param settingsConfig - Settings configuration
 */
export async function runBackupSchedulerLoop(
  backupConfig: BackupConfig,
  settingsConfig: SettingsConfig
): Promise<void> {
  isBackupLoopActive = true;
  Logger.info('[Scheduler] Backup scheduler started');

  while (isBackupLoopActive) {
    try {
      const settings = await settingsService.loadSettings(settingsConfig);
      const waitTime = Math.max(settings.BACKUP_INTERVAL * 1000, MINIMUM_LOOP_WAIT_MS);

      Logger.info(`[Scheduler] Next backup in ${Math.round(waitTime / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (!isBackupLoopActive) break;

      Logger.info('[Scheduler] Creating scheduled backup...');
      await backupService.createBackup(backupConfig);
      await backupService.pruneOldBackups(backupConfig, settings.MAX_BACKUPS);

      lastSuccessfulBackupTime = Math.floor(Date.now() / 1000);
      lastFailedBackupTime = null;
      lastBackupError = null;

      Logger.info('[Scheduler] Backup completed successfully');
    } catch (error) {
      lastFailedBackupTime = Math.floor(Date.now() / 1000);
      lastBackupError = error instanceof Error ? error.message : String(error);
      Logger.error('[Scheduler] Backup failed:', error);
    }
  }
}

/**
 * Stops the backup scheduler loop.
 *
 * **Why:** Allows graceful shutdown of background jobs.
 */
export function stopScheduler(): void {
  isBackupLoopActive = false;
  Logger.info('[Scheduler] Backup scheduler stopped');
}

/**
 * Executes a manual backup immediately.
 *
 * **Why:** Allows users to trigger backups on demand.
 *
 * @param backupConfig - Backup configuration
 * @param settings - Backup settings
 * @param notes - Optional notes for the backup
 */
export async function executeBackupAndPrune(
  backupConfig: BackupConfig,
  settings: BackupSettings,
  notes?: string
): Promise<void> {
  Logger.info('[Scheduler] Executing manual backup...');
  await backupService.createBackup(backupConfig, notes);
  await backupService.pruneOldBackups(backupConfig, settings.MAX_BACKUPS);
  Logger.info('[Scheduler] Manual backup completed');
}
