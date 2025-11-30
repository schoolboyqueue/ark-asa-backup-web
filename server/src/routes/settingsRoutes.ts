/**
 * @fileoverview Settings management routes for ARK ASA Backup Manager.
 * Handles retrieval and updates of backup configuration settings.
 */

import { Router, Request, Response } from 'express';
import { loadBackupSettings, saveBackupSettings } from '../services/settingsService.js';
import { pruneOldBackupArchives } from '../services/backupService.js';
import { DEFAULT_BACKUP_SETTINGS } from '../config/constants.js';
import { Logger } from '../utils/logger.js';

const settingsRouter = Router();

// ============================================================================
// Settings Routes
// ============================================================================

/**
 * Retrieves current backup configuration settings.
 * @route GET /api/settings
 */
settingsRouter.get('/api/settings', async (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received');
  try {
    const currentSettings = await loadBackupSettings();
    Logger.info(httpRequest, 'Settings loaded', currentSettings);
    httpResponse.json(currentSettings);
    Logger.info(httpRequest, 'Response sent successfully');
  } catch (error) {
    Logger.error(httpRequest, 'Error', error);
    httpResponse.status(500).json({ ok: false, error: 'Failed to load settings' });
  }
});

/**
 * Updates backup configuration settings.
 * Validates input and triggers immediate pruning with new retention limit.
 * @route POST /api/settings
 */
settingsRouter.post('/api/settings', async (httpRequest: Request, httpResponse: Response) => {
  Logger.info(httpRequest, 'Request received', httpRequest.body);
  try {
    const { BACKUP_INTERVAL, MAX_BACKUPS, AUTO_SAFETY_BACKUP } = httpRequest.body;

    const newBackupInterval =
      parseInt(BACKUP_INTERVAL, 10) || DEFAULT_BACKUP_SETTINGS.BACKUP_INTERVAL;
    const newMaxBackups = parseInt(MAX_BACKUPS, 10) || DEFAULT_BACKUP_SETTINGS.MAX_BACKUPS;
    const newAutoSafetyBackup =
      AUTO_SAFETY_BACKUP !== undefined ? Boolean(AUTO_SAFETY_BACKUP) : true;

    Logger.info(httpRequest, 'Parsed settings', {
      newBackupInterval,
      newMaxBackups,
      newAutoSafetyBackup,
    });

    Logger.info(httpRequest, 'Saving settings...');
    await saveBackupSettings(newBackupInterval, newMaxBackups, newAutoSafetyBackup);
    Logger.info(httpRequest, 'Settings saved, pruning backups...');
    await pruneOldBackupArchives(newMaxBackups);
    Logger.info(httpRequest, 'Backups pruned, loading updated settings...');

    const updatedSettings = await loadBackupSettings();
    Logger.info(httpRequest, 'Updated settings loaded', updatedSettings);
    httpResponse.json({ ok: true, settings: updatedSettings });
    Logger.info(httpRequest, 'Response sent successfully');
  } catch (error) {
    Logger.error(httpRequest, 'Error', error);
    httpResponse.status(500).json({ ok: false, error: 'Failed to update settings' });
  }
});

export default settingsRouter;
