/**
 * @fileoverview Settings validation business logic.
 * Pure functions for validating backup configuration.
 *
 * Clean Architecture: Service Layer
 */

import type { BackupSettings, SettingsValidationResult } from '../domain/server';

/** Minimum backup interval in seconds (1 minute) */
export const MIN_BACKUP_INTERVAL_SECONDS = 60;

/** Maximum backup interval in seconds (24 hours) */
export const MAX_BACKUP_INTERVAL_SECONDS = 86400;

/** Minimum backups to retain */
export const MIN_BACKUPS_TO_KEEP = 1;

/** Maximum backups to retain */
export const MAX_BACKUPS_TO_KEEP = 100;

/**
 * Validates backup interval value.
 *
 * @param {number} intervalSeconds - Backup interval in seconds
 * @returns {string | undefined} Error message if invalid
 */
export function validateBackupInterval(intervalSeconds: number): string | undefined {
  if (isNaN(intervalSeconds)) {
    return 'Backup interval must be a number';
  }

  if (intervalSeconds < MIN_BACKUP_INTERVAL_SECONDS) {
    return `Backup interval must be at least ${MIN_BACKUP_INTERVAL_SECONDS} seconds (1 minute)`;
  }

  if (intervalSeconds > MAX_BACKUP_INTERVAL_SECONDS) {
    return `Backup interval must be at most ${MAX_BACKUP_INTERVAL_SECONDS} seconds (24 hours)`;
  }

  return undefined;
}

/**
 * Validates max backups value.
 *
 * @param {number} maxBackups - Maximum backups to keep
 * @returns {string | undefined} Error message if invalid
 */
export function validateMaxBackups(maxBackups: number): string | undefined {
  if (isNaN(maxBackups)) {
    return 'Max backups must be a number';
  }

  if (maxBackups < MIN_BACKUPS_TO_KEEP) {
    return `Must keep at least ${MIN_BACKUPS_TO_KEEP} backup`;
  }

  if (maxBackups > MAX_BACKUPS_TO_KEEP) {
    return `Cannot keep more than ${MAX_BACKUPS_TO_KEEP} backups`;
  }

  return undefined;
}

/**
 * Validates complete backup settings.
 *
 * @param {BackupSettings} settings - Settings to validate
 * @returns {SettingsValidationResult} Validation result with errors
 */
export function validateBackupSettings(settings: BackupSettings): SettingsValidationResult {
  const errors: { backupInterval?: string; maxBackups?: string } = {};

  const intervalError = validateBackupInterval(settings.backupIntervalSeconds);
  if (intervalError) {
    errors.backupInterval = intervalError;
  }

  const maxBackupsError = validateMaxBackups(settings.maxBackupsToKeep);
  if (maxBackupsError) {
    errors.maxBackups = maxBackupsError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats interval seconds to human-readable string.
 *
 * @param {number} seconds - Interval in seconds
 * @returns {string} Human-readable interval
 */
export function formatBackupInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
