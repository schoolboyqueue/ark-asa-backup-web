/**
 * @fileoverview Settings management routes for ARK ASA Backup Manager.
 * Handles retrieval and updates of backup configuration settings.
 */

import { Router, Request, Response } from 'express';
import { loadBackupSettings, saveBackupSettings } from '../services/settingsService.js';
import { pruneOldBackupArchives } from '../services/backupService.js';
import { DEFAULT_BACKUP_SETTINGS } from '../config/constants.js';

const settingsRouter = Router();

// ============================================================================
// Settings Routes
// ============================================================================

/**
 * Retrieves current backup configuration settings.
 * @route GET /api/settings
 */
settingsRouter.get('/api/settings', async (_httpRequest: Request, httpResponse: Response) => {
  const currentSettings = await loadBackupSettings();
  httpResponse.json(currentSettings);
});

/**
 * Updates backup configuration settings.
 * Validates input and triggers immediate pruning with new retention limit.
 * @route POST /api/settings
 */
settingsRouter.post('/api/settings', async (httpRequest: Request, httpResponse: Response) => {
  const { BACKUP_INTERVAL, MAX_BACKUPS, AUTO_SAFETY_BACKUP } = httpRequest.body;

  const newBackupInterval =
    parseInt(BACKUP_INTERVAL, 10) || DEFAULT_BACKUP_SETTINGS.BACKUP_INTERVAL;
  const newMaxBackups = parseInt(MAX_BACKUPS, 10) || DEFAULT_BACKUP_SETTINGS.MAX_BACKUPS;
  const newAutoSafetyBackup = AUTO_SAFETY_BACKUP !== undefined ? Boolean(AUTO_SAFETY_BACKUP) : true;

  await saveBackupSettings(newBackupInterval, newMaxBackups, newAutoSafetyBackup);
  await pruneOldBackupArchives(newMaxBackups);

  const updatedSettings = await loadBackupSettings();
  httpResponse.json({ ok: true, settings: updatedSettings });
});

export default settingsRouter;
