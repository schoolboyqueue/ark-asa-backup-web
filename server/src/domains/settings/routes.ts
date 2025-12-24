/**
 * @fileoverview Settings domain HTTP routes.
 * Handles settings management endpoints.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** Request/response handling, input validation
 * **Dependencies:** Settings service, backup service, error handling
 * **Used By:** Express application
 */

import { type Request, type Response, Router } from 'express';
import { asyncHandler } from '../../utils/errorHandler.js';
import type { BackupConfig } from '../backup/service.js';
import * as backupService from '../backup/service.js';
import type { SettingsConfig } from './service.js';
import * as settingsService from './service.js';

/**
 * Creates settings routes with injected dependencies.
 *
 * @param settingsConfig - Settings configuration
 * @param backupConfig - Backup configuration
 * @returns Express router with settings endpoints
 */
export function createSettingsRoutes(
  settingsConfig: SettingsConfig,
  backupConfig: BackupConfig
): Router {
  const router = Router();

  /**
   * GET /api/settings - Get current settings
   */
  router.get(
    '/api/settings',
    asyncHandler(async (_req: Request, res: Response) => {
      const settings = await settingsService.loadSettings(settingsConfig);
      res.json(settings);
    })
  );

  /**
   * POST /api/settings - Update settings
   */
  router.post(
    '/api/settings',
    asyncHandler(async (req: Request, res: Response) => {
      const { BACKUP_INTERVAL, MAX_BACKUPS, AUTO_SAFETY_BACKUP } = req.body;

      const newSettings = {
        BACKUP_INTERVAL:
          Number.parseInt(BACKUP_INTERVAL, 10) || settingsConfig.defaults.BACKUP_INTERVAL,
        MAX_BACKUPS: Number.parseInt(MAX_BACKUPS, 10) || settingsConfig.defaults.MAX_BACKUPS,
        AUTO_SAFETY_BACKUP: AUTO_SAFETY_BACKUP === undefined ? true : Boolean(AUTO_SAFETY_BACKUP),
      };

      // Validate settings
      settingsService.validateSettings(settingsConfig, newSettings);

      // Save settings
      await settingsService.saveSettings(settingsConfig, newSettings);

      // Prune backups with new retention policy
      await backupService.pruneOldBackups(backupConfig, newSettings.MAX_BACKUPS);

      // Return updated settings
      const updatedSettings = await settingsService.loadSettings(settingsConfig);
      res.json({ ok: true, settings: updatedSettings });
    })
  );

  return router;
}
