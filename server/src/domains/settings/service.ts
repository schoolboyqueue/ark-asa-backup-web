/**
 * @fileoverview Settings domain business logic layer.
 * Implements settings management with validation.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Load, save, validate backup settings
 * **Dependencies:** Repository (file I/O)
 * **Used By:** Routes, backup service
 *
 * **Design:** All configuration is injected as parameters.
 */

import type { BackupSettings } from '../backup/types.js';
import * as repository from './repository.js';

/**
 * Configuration for settings operations.
 */
export interface SettingsConfig {
  configPath: string;
  defaults: BackupSettings;
  minInterval: number;
  minRetention: number;
}

/**
 * Loads backup settings with validation and defaults.
 *
 * **Why:** Ensures settings are valid and applies defaults for missing values.
 *
 * @param config - Settings configuration
 * @returns Validated backup settings
 */
export async function loadSettings(config: SettingsConfig): Promise<BackupSettings> {
  const fileSettings = await repository.loadSettingsFile(config.configPath);

  const backupInterval = Math.max(
    parseInt(fileSettings.BACKUP_INTERVAL || '', 10) || config.defaults.BACKUP_INTERVAL,
    config.minInterval
  );

  const maxBackups = Math.max(
    parseInt(fileSettings.MAX_BACKUPS || '', 10) || config.defaults.MAX_BACKUPS,
    config.minRetention
  );

  const autoSafetyBackup =
    fileSettings.AUTO_SAFETY_BACKUP !== undefined
      ? fileSettings.AUTO_SAFETY_BACKUP === 'true'
      : (config.defaults.AUTO_SAFETY_BACKUP ?? true);

  return {
    BACKUP_INTERVAL: backupInterval,
    MAX_BACKUPS: maxBackups,
    AUTO_SAFETY_BACKUP: autoSafetyBackup,
  };
}

/**
 * Saves backup settings to file.
 *
 * **Why:** Persists user configuration changes.
 *
 * @param config - Settings configuration
 * @param settings - Settings to save
 */
export async function saveSettings(
  config: SettingsConfig,
  settings: BackupSettings
): Promise<void> {
  const fileSettings: Record<string, string> = {
    BACKUP_INTERVAL: String(settings.BACKUP_INTERVAL),
    MAX_BACKUPS: String(settings.MAX_BACKUPS),
    AUTO_SAFETY_BACKUP: String(settings.AUTO_SAFETY_BACKUP ?? true),
  };

  await repository.saveSettingsFile(config.configPath, fileSettings);
}

/**
 * Validates settings against constraints.
 *
 * **Why:** Ensures settings are within acceptable ranges.
 *
 * @param config - Settings configuration
 * @param settings - Settings to validate
 * @throws Error if settings are invalid
 */
export function validateSettings(config: SettingsConfig, settings: BackupSettings): void {
  if (settings.BACKUP_INTERVAL < config.minInterval) {
    throw new Error(`BACKUP_INTERVAL must be at least ${config.minInterval} seconds`);
  }

  if (settings.MAX_BACKUPS < config.minRetention) {
    throw new Error(`MAX_BACKUPS must be at least ${config.minRetention}`);
  }
}
