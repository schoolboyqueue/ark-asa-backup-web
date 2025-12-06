/**
 * @fileoverview Backup domain HTTP routes.
 * Handles backup CRUD operations and verification endpoints.
 *
 * **Layer:** Transport / HTTP
 * **Responsibility:** Request/response handling, input validation
 * **Dependencies:** Backup service, error handling utilities
 * **Used By:** Express application
 *
 * **Design:** Routes receive configuration and services as dependencies,
 * making them testable and flexible.
 */

import { Request, Response, Router } from 'express';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { asyncHandler, NotFoundError, ValidationError } from '../../utils/errorHandler.js';
import type { BackupConfig } from './service.js';
import * as backupService from './service.js';

/**
 * Creates backup routes with injected configuration.
 *
 * @param config - Backup configuration (backupDir, saveDir, etc.)
 * @param settingsLoader - Function to load current backup settings
 * @returns Express router with backup endpoints
 */
export function createBackupRoutes(
  config: BackupConfig,
  settingsLoader: () => Promise<{ BACKUP_INTERVAL: number; MAX_BACKUPS: number }>
): Router {
  const router = Router();

  /**
   * GET /api/backups - List all backups
   */
  router.get(
    '/api/backups',
    asyncHandler(async (_req: Request, res: Response) => {
      const backups = await backupService.listBackups(config);
      res.json(backups);
    })
  );

  /**
   * POST /api/backups/trigger - Create manual backup
   */
  router.post(
    '/api/backups/trigger',
    asyncHandler(async (req: Request, res: Response) => {
      const { notes } = req.body;
      const settings = await settingsLoader();

      await backupService.createBackup(config, notes);
      await backupService.pruneOldBackups(config, settings.MAX_BACKUPS);

      const backups = await backupService.listBackups(config);
      res.json({ ok: true, backups });
    })
  );

  /**
   * PUT /api/backups/notes - Update backup metadata
   */
  router.put(
    '/api/backups/notes',
    asyncHandler(async (req: Request, res: Response) => {
      const { backup_name, notes, tags } = req.body;

      if (!backup_name) {
        throw new ValidationError('backup_name is required');
      }

      // Verify backup exists
      const backupPath = path.join(config.backupDir, backup_name);
      try {
        await fs.access(backupPath);
      } catch {
        throw new NotFoundError('Backup not found');
      }

      await backupService.updateMetadata(config, backup_name, notes || '', tags || []);
      res.json({ ok: true });
    })
  );

  /**
   * POST /api/backups/:backupName/verify - Verify backup integrity
   */
  router.post(
    '/api/backups/:backupName/verify',
    asyncHandler(async (req: Request, res: Response) => {
      const backupName = req.params.backupName;

      if (!backupName) {
        throw new ValidationError('backup_name is required');
      }

      // Verify backup exists
      const backupPath = path.join(config.backupDir, backupName);
      try {
        await fs.access(backupPath);
      } catch {
        throw new NotFoundError('Backup not found');
      }

      const verification = await backupService.verifyBackup(config, backupName);
      res.json({ ok: true, verification });
    })
  );

  /**
   * POST /api/delete - Delete a backup
   */
  router.post(
    '/api/delete',
    asyncHandler(async (req: Request, res: Response) => {
      const { backup_name: backupName } = req.body;

      if (!backupName) {
        throw new ValidationError('backup_name is required');
      }

      // Verify backup exists
      const backupPath = path.join(config.backupDir, backupName);
      try {
        await fs.access(backupPath);
      } catch {
        throw new NotFoundError('backup not found');
      }

      await backupService.deleteBackup(config, backupName);
      res.json({ ok: true });
    })
  );

  /**
   * GET /api/download/:backupName - Download backup file
   */
  router.get(
    '/api/download/:backupName',
    asyncHandler(async (req: Request, res: Response) => {
      const backupName = req.params.backupName;

      if (!backupName) {
        throw new ValidationError('backup name is required');
      }

      const backupPath = path.join(config.backupDir, backupName);

      // Verify backup exists
      try {
        await fs.access(backupPath);
      } catch {
        throw new NotFoundError('backup not found');
      }

      const fileStats = await fs.stat(backupPath);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${backupName}"`);
      res.setHeader('Content-Length', fileStats.size);

      // Stream the file
      const fileStream = createReadStream(backupPath);
      fileStream.pipe(res);
    })
  );

  return router;
}
