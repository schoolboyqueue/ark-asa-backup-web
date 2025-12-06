/**
 * @fileoverview Backup management routes for ARK ASA Backup Manager.
 * Handles backup CRUD operations, verification, and file downloads.
 */

import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import path from 'path';
import {
  listAvailableBackups,
  saveBackupMetadata,
  verifyBackupIntegrity,
  saveVerificationResult,
  deleteBackup,
} from '../services/backupService.js';
import { executeBackupAndPrune } from '../services/schedulerService.js';
import { loadBackupSettings } from '../services/settingsService.js';
import { BACKUP_STORAGE_DIRECTORY } from '../config/constants.js';
import { asyncHandler, ValidationError, NotFoundError } from '../utils/errorHandler.js';

const backupRouter = Router();

// ============================================================================
// Backup List and Trigger Routes
// ============================================================================

/**
 * Lists all available backup archives with metadata.
 * @route GET /api/backups
 */
backupRouter.get(
  '/api/backups',
  asyncHandler(async (_httpRequest: Request, httpResponse: Response) => {
    const availableBackups = await listAvailableBackups();
    httpResponse.json(availableBackups);
  })
);

/**
 * Triggers an immediate manual backup outside the normal schedule.
 * Creates a backup archive and prunes old backups according to current settings.
 * Accepts optional notes field for user-provided backup description.
 * @route POST /api/backups/trigger
 */
backupRouter.post(
  '/api/backups/trigger',
  asyncHandler(async (httpRequest: Request, httpResponse: Response) => {
    const { notes } = httpRequest.body;
    const currentSettings = await loadBackupSettings();
    await executeBackupAndPrune(currentSettings, notes);
    const updatedBackupsList = await listAvailableBackups();
    httpResponse.json({ ok: true, backups: updatedBackupsList });
  })
);

// ============================================================================
// Backup Metadata Routes
// ============================================================================

/**
 * Updates the metadata (notes and tags) for an existing backup.
 * Updates or creates the .meta.json file for the specified backup.
 * @route PUT /api/backups/notes
 */
backupRouter.put(
  '/api/backups/notes',
  asyncHandler(async (httpRequest: Request, httpResponse: Response) => {
    const { backup_name, notes, tags } = httpRequest.body;

    if (!backup_name) {
      throw new ValidationError('backup_name is required');
    }

    // Verify backup exists
    const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backup_name);
    try {
      await fs.access(backupFilePath);
    } catch {
      throw new NotFoundError('Backup not found');
    }

    // Save or remove metadata
    if ((notes !== undefined && notes.trim()) || (tags !== undefined && tags.length > 0)) {
      await saveBackupMetadata(backup_name, notes?.trim() || '', tags || []);
    } else {
      // Remove metadata file if both notes and tags are empty
      const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backup_name}.meta.json`);
      try {
        await fs.unlink(metadataFilePath);
      } catch {
        // Ignore error if metadata file doesn't exist
      }
    }

    httpResponse.json({ ok: true });
  })
);

/**
 * Manually verifies a backup archive integrity.
 * Tests that the tar.gz file is readable, counts files, and saves verification result.
 * @route POST /api/backups/:backupName/verify
 */
backupRouter.post(
  '/api/backups/:backupName/verify',
  asyncHandler(async (httpRequest: Request, httpResponse: Response) => {
    const backupNameToVerify = httpRequest.params.backupName;

    if (!backupNameToVerify) {
      throw new ValidationError('backup_name is required');
    }

    // Verify backup exists
    const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToVerify);
    try {
      await fs.access(backupFilePath);
    } catch {
      throw new NotFoundError('Backup not found');
    }

    // Run verification
    const verificationResult = await verifyBackupIntegrity(backupNameToVerify);
    await saveVerificationResult(backupNameToVerify, verificationResult);

    httpResponse.json({
      ok: true,
      verification: verificationResult,
    });
  })
);

// ============================================================================
// Backup Deletion Routes
// ============================================================================

/**
 * Deletes a specific backup archive and its associated metadata files.
 * @route POST /api/delete
 */
backupRouter.post(
  '/api/delete',
  asyncHandler(async (httpRequest: Request, httpResponse: Response) => {
    const { backup_name: backupNameToDelete } = httpRequest.body;

    if (!backupNameToDelete) {
      throw new ValidationError('backup_name is required');
    }

    // Verify backup exists
    const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToDelete);
    try {
      await fs.access(backupFilePath);
    } catch {
      throw new NotFoundError('backup not found');
    }

    // Delete backup and metadata files
    await deleteBackup(backupNameToDelete);
    httpResponse.json({ ok: true });
  })
);

// ============================================================================
// Backup Download Routes
// ============================================================================

/**
 * Downloads a backup archive file.
 * Streams the backup file to the client for local storage.
 * @route GET /api/download/:backupName
 */
backupRouter.get(
  '/api/download/:backupName',
  asyncHandler(async (httpRequest: Request, httpResponse: Response) => {
    const backupNameToDownload = httpRequest.params.backupName;

    if (!backupNameToDownload) {
      throw new ValidationError('backup name is required');
    }

    const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToDownload);

    // Verify backup file exists
    try {
      await fs.access(backupFilePath);
    } catch {
      throw new NotFoundError('backup not found');
    }

    const fileStats = await fs.stat(backupFilePath);

    // Set headers for file download
    httpResponse.setHeader('Content-Type', 'application/gzip');
    httpResponse.setHeader('Content-Disposition', `attachment; filename="${backupNameToDownload}"`);
    httpResponse.setHeader('Content-Length', fileStats.size);

    // Stream the file to the client
    const fileStream = createReadStream(backupFilePath);
    fileStream.pipe(httpResponse);
  })
);

export default backupRouter;
