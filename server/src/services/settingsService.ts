/**
 * @fileoverview Settings management service for ARK ASA Backup Manager.
 * Handles loading, saving, and validating backup configuration settings.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { BackupSettings } from '../types/index.js';
import {
  CONFIGURATION_FILE_PATH,
  DEFAULT_BACKUP_SETTINGS,
  MINIMUM_BACKUP_INTERVAL_SECONDS,
  MINIMUM_BACKUP_RETENTION_COUNT,
} from '../config/constants.js';
import { Logger } from '../utils/logger.js';

/**
 * Loads backup configuration from disk with validation and fallback.
 * Parses environment-style configuration file and applies constraints.
 *
 * @returns {Promise<BackupSettings>} Validated backup configuration
 * @async
 */
export async function loadBackupSettings(): Promise<BackupSettings> {
  const configurationSettings: BackupSettings = { ...DEFAULT_BACKUP_SETTINGS };

  try {
    const fileContent = await fs.readFile(CONFIGURATION_FILE_PATH, 'utf-8');
    const parsedSettings: Record<string, string> = {};

    for (const fileLine of fileContent.split('\n')) {
      const trimmedLine = fileLine.trim();
      if (!trimmedLine || trimmedLine.startsWith('#') || !trimmedLine.includes('=')) {
        continue;
      }
      const [settingKey, settingValue] = trimmedLine.split('=', 2);
      parsedSettings[settingKey.trim()] = settingValue.trim();
    }

    // Parse and validate backup interval
    const parsedInterval = parseInt(parsedSettings.BACKUP_INTERVAL || '', 10);
    if (!isNaN(parsedInterval)) {
      configurationSettings.BACKUP_INTERVAL = Math.max(
        MINIMUM_BACKUP_INTERVAL_SECONDS,
        parsedInterval
      );
    }

    // Parse and validate max backups
    const parsedMaxBackups = parseInt(parsedSettings.MAX_BACKUPS || '', 10);
    if (!isNaN(parsedMaxBackups)) {
      configurationSettings.MAX_BACKUPS = Math.max(
        MINIMUM_BACKUP_RETENTION_COUNT,
        parsedMaxBackups
      );
    }

    // Parse auto safety backup setting (default: true)
    if (parsedSettings.AUTO_SAFETY_BACKUP !== undefined) {
      configurationSettings.AUTO_SAFETY_BACKUP =
        parsedSettings.AUTO_SAFETY_BACKUP.toLowerCase() === 'true';
    }
  } catch (error) {
    // Configuration file doesn't exist or is unreadable - use defaults
    Logger.warn('Failed to load configuration settings, using defaults:', error);
  }

  return configurationSettings;
}

/**
 * Persists validated backup configuration to disk.
 * Creates configuration directory if needed and writes formatted settings file.
 *
 * @param {number} backupIntervalSeconds - Interval between backups in seconds
 * @param {number} maximumBackupsToRetain - Number of backups to keep
 * @param {boolean} autoSafetyBackup - Whether to create pre-restore safety backups
 * @returns {Promise<void>}
 * @async
 */
export async function saveBackupSettings(
  backupIntervalSeconds: number,
  maximumBackupsToRetain: number,
  autoSafetyBackup: boolean = true
): Promise<void> {
  const validatedInterval = Math.max(MINIMUM_BACKUP_INTERVAL_SECONDS, backupIntervalSeconds);
  const validatedMaxBackups = Math.max(MINIMUM_BACKUP_RETENTION_COUNT, maximumBackupsToRetain);

  const configurationContent = `# ARK ASA Backup Manager Configuration
# Interval between automatic backups in seconds
BACKUP_INTERVAL=${validatedInterval}
# Maximum number of backup archives to retain (older ones are deleted)
MAX_BACKUPS=${validatedMaxBackups}
# Automatically create pre-restore safety backup (true/false)
AUTO_SAFETY_BACKUP=${autoSafetyBackup}
`;

  // Ensure configuration directory exists
  await fs.mkdir(path.dirname(CONFIGURATION_FILE_PATH), { recursive: true });
  await fs.writeFile(CONFIGURATION_FILE_PATH, configurationContent, 'utf-8');
}
