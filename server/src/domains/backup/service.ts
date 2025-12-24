/**
 * @fileoverview Backup domain business logic layer.
 * Implements backup operations with business rules and validation.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Backup creation, verification, metadata, retention policies
 * **Dependencies:** Repository (data-access), save info extraction
 * **Used By:** Routes, scheduler
 *
 * **Design:** All configuration is injected as parameters, not imported directly.
 * This makes the service testable and flexible.
 */

import { promises as fs } from 'node:fs';
import { Logger } from '../../utils/logger.js';
import { extractSaveInfo } from '../saveInfo/service.js';
import * as repository from './repository.js';
import type { BackupMetadata, SaveInfo, VerificationResult } from './types.js';

/**
 * Configuration for backup operations.
 * Injected into service functions rather than imported globally.
 */
export interface BackupConfig {
  backupDir: string;
  saveDir: string;
  userId: number;
  groupId: number;
}

/**
 * Creates a new backup archive from save files.
 *
 * **Why:** Encapsulates the backup creation process with proper naming,
 * metadata extraction, and error handling.
 *
 * @param config - Backup configuration (injected)
 * @param notes - Optional user notes for this backup
 * @returns Backup metadata for the created backup
 * @throws Error if backup creation fails
 */
export async function createBackup(config: BackupConfig, notes?: string): Promise<BackupMetadata> {
  // Generate backup filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().replaceAll(/[:.]/g, '').slice(0, 15);
  const backupFileName = `saves-${timestamp}.tar.gz`;

  // Create archive
  await repository.createArchive(config.saveDir, config.backupDir, backupFileName);

  // Extract save info for metadata
  let saveInfo: SaveInfo | undefined;
  try {
    saveInfo = await extractSaveInfo(config.backupDir, backupFileName);
  } catch (error) {
    // Log but continue if save info extraction fails—backup is still valid
    Logger.warn(`Failed to extract save info for ${backupFileName}:`, error);
  }

  // Save metadata
  await repository.saveMetadata(config.backupDir, backupFileName, notes || '', [], saveInfo);

  // Return backup metadata
  return {
    name: backupFileName,
    size_bytes: 0, // Will be populated by listBackups
    mtime: Math.floor(Date.now() / 1000),
    notes,
    save_info: saveInfo,
  };
}

/**
 * Lists all available backups with metadata.
 *
 * **Why:** Aggregates backup files with their metadata and verification status
 * for display to users.
 *
 * @param config - Backup configuration (injected)
 * @returns Array of backup metadata sorted by modification time (newest first)
 */
export async function listBackups(config: BackupConfig): Promise<BackupMetadata[]> {
  const backupFiles = await repository.listBackupFiles(config.backupDir);

  const backups = await Promise.all(
    backupFiles.map(async (file) => {
      const stats = await fs.stat(file.path);
      const metadata = await repository.loadMetadata(config.backupDir, file.name);
      const verification = await repository.loadVerification(config.backupDir, file.name);

      return {
        name: file.name,
        size_bytes: stats.size,
        mtime: Math.floor(stats.mtimeMs / 1000),
        mtime_human: new Date(stats.mtimeMs).toISOString(),
        notes: metadata?.notes as string | undefined,
        tags: metadata?.tags as string[] | undefined,
        verification_status: verification?.status || 'unknown',
        verification_time: verification?.verification_time,
        verified_file_count: verification?.file_count,
        verification_error: verification?.error,
        save_info: metadata?.save_info as SaveInfo | undefined,
      };
    })
  );

  return backups;
}

/**
 * Verifies a backup archive integrity.
 *
 * **Why:** Tests that the backup is readable and not corrupted,
 * saving the result for future reference.
 *
 * @param config - Backup configuration (injected)
 * @param backupFileName - Name of backup to verify
 * @returns Verification result
 */
export async function verifyBackup(
  config: BackupConfig,
  backupFileName: string
): Promise<VerificationResult> {
  const result = await repository.verifyIntegrity(config.backupDir, backupFileName);
  await repository.saveVerification(config.backupDir, backupFileName, result);
  return result;
}

/**
 * Deletes a backup archive and its metadata.
 *
 * **Why:** Removes backup and associated files cleanly.
 *
 * @param config - Backup configuration (injected)
 * @param backupFileName - Name of backup to delete
 */
export async function deleteBackup(config: BackupConfig, backupFileName: string): Promise<void> {
  await repository.deleteBackupFile(config.backupDir, backupFileName);
}

/**
 * Prunes old backups based on retention policy.
 *
 * **Why:** Enforces the MAX_BACKUPS retention policy by removing
 * oldest backups when limit is exceeded.
 *
 * @param config - Backup configuration (injected)
 * @param maxBackups - Maximum number of backups to retain
 */
export async function pruneOldBackups(config: BackupConfig, maxBackups: number): Promise<void> {
  const backups = await listBackups(config);

  if (backups.length > maxBackups) {
    const backupsToDelete = backups.slice(maxBackups);

    for (const backup of backupsToDelete) {
      await deleteBackup(config, backup.name);
    }
  }
}

/**
 * Updates backup metadata (notes and tags).
 *
 * **Why:** Allows users to annotate backups with notes and tags
 * for better organization and identification.
 *
 * @param config - Backup configuration (injected)
 * @param backupFileName - Name of backup to update
 * @param notes - New notes (or empty string to clear)
 * @param tags - New tags (or empty array to clear)
 */
export async function updateMetadata(
  config: BackupConfig,
  backupFileName: string,
  notes: string,
  tags: string[]
): Promise<void> {
  const metadata = await repository.loadMetadata(config.backupDir, backupFileName);
  const saveInfo = metadata?.save_info as SaveInfo | undefined;

  if (notes || tags.length > 0) {
    await repository.saveMetadata(config.backupDir, backupFileName, notes, tags, saveInfo);
  } else {
    // Delete metadata file if both notes and tags are empty
    try {
      const metadataPath = `${config.backupDir}/${backupFileName}.meta.json`;
      await fs.unlink(metadataPath);
    } catch (error) {
      // Silently ignore if file doesn't exist; other errors are unexpected but non-fatal
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        Logger.warn(`Unexpected error deleting metadata for ${backupFileName}:`, error);
      }
    }
  }
}
