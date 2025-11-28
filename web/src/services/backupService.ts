/**
 * @fileoverview Backup management service for ARK ASA Backup Manager.
 * Handles backup creation, verification, metadata management, and pruning operations.
 */

import { promises as fs } from 'fs';
import path from 'path';
import tar from 'tar';
import type {
  BackupMetadata,
  BackupFileEntry,
  BackupSettings,
  VerificationResult,
} from '../types/index.js';
import {
  BACKUP_STORAGE_DIRECTORY,
  ARK_SAVE_DIRECTORY,
  PROCESS_USER_ID,
  PROCESS_GROUP_ID,
} from '../config/constants.js';

// ============================================================================
// Notes Management
// ============================================================================

/**
 * Saves backup metadata (notes and tags) to a .meta.json file.
 * Creates or updates the metadata file with user-provided information.
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @param {string} notes - User-provided notes for the backup
 * @param {string[]} tags - Array of tags for categorizing the backup
 * @returns {Promise<void>}
 * @async
 */
export async function saveBackupMetadata(
  backupFileName: string,
  notes: string,
  tags: string[]
): Promise<void> {
  const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupFileName}.meta.json`);

  const backupMetadata = {
    name: backupFileName,
    created_at: Math.floor(Date.now() / 1000),
    notes: notes || undefined,
    tags: tags.length > 0 ? tags : undefined,
  };

  await fs.writeFile(metadataFilePath, JSON.stringify(backupMetadata, null, 2), 'utf-8');

  try {
    await fs.chown(metadataFilePath, PROCESS_USER_ID, PROCESS_GROUP_ID);
  } catch (chownError) {
    console.warn('Failed to change metadata file ownership:', chownError);
  }

  console.log(`Backup metadata saved: ${backupFileName}`);
}

/**
 * Legacy function name for backward compatibility.
 * @deprecated Use saveBackupMetadata instead.
 */
export async function saveBackupNotes(backupFileName: string, notes: string): Promise<void> {
  await saveBackupMetadata(backupFileName, notes, []);
}

/**
 * Loads backup notes from a JSON metadata file if it exists.
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @returns {Promise<string | undefined>} Notes text if file exists, undefined otherwise
 * @async
 */
export async function loadBackupNotes(backupFileName: string): Promise<string | undefined> {
  const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupFileName}.meta.json`);

  try {
    const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
    const metadata = JSON.parse(metadataContent) as { notes?: string };
    return metadata.notes;
  } catch (loadError) {
    // Metadata file doesn't exist or is invalid - this is normal for backups without notes
    return undefined;
  }
}

// ============================================================================
// Verification Management
// ============================================================================

/**
 * Saves verification result to a JSON metadata file alongside the backup archive.
 * Verification files are named with .verify.json extension (e.g., saves-20240115-120000.tar.gz.verify.json)
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @param {VerificationResult} verificationResult - Verification result data
 * @returns {Promise<void>}
 * @async
 */
export async function saveVerificationResult(
  backupFileName: string,
  verificationResult: VerificationResult
): Promise<void> {
  const verificationFilePath = path.join(
    BACKUP_STORAGE_DIRECTORY,
    `${backupFileName}.verify.json`
  );

  try {
    await fs.writeFile(
      verificationFilePath,
      JSON.stringify(verificationResult, null, 2),
      'utf-8'
    );

    // Attempt to set correct file ownership
    try {
      await fs.chown(verificationFilePath, PROCESS_USER_ID, PROCESS_GROUP_ID);
    } catch (chownError) {
      console.warn('Failed to change verification file ownership:', chownError);
    }
  } catch (saveError) {
    console.error(`Failed to save verification result for ${backupFileName}:`, saveError);
  }
}

/**
 * Loads verification result from a JSON metadata file if it exists.
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @returns {Promise<VerificationResult | null>} Verification result if file exists, null otherwise
 * @async
 */
export async function loadVerificationResult(backupFileName: string): Promise<VerificationResult | null> {
  const verificationFilePath = path.join(
    BACKUP_STORAGE_DIRECTORY,
    `${backupFileName}.verify.json`
  );

  try {
    const verificationContent = await fs.readFile(verificationFilePath, 'utf-8');
    return JSON.parse(verificationContent) as VerificationResult;
  } catch (loadError) {
    // Verification file doesn't exist - backup hasn't been verified yet
    return null;
  }
}

/**
 * Verifies the integrity of a backup archive by attempting to list its contents.
 * Tests that the tar.gz file is readable and not corrupted.
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @returns {Promise<VerificationResult>} Verification result with status and file count
 * @async
 */
export async function verifyBackupIntegrity(backupFileName: string): Promise<VerificationResult> {
  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupFileName);
  const verificationTime = Math.floor(Date.now() / 1000);

  try {
    // Verify file exists
    await fs.access(backupFilePath);

    // List contents of tar.gz archive without extracting
    const archiveContents: string[] = [];
    await tar.list({
      file: backupFilePath,
      onentry: (entry) => {
        archiveContents.push(entry.path);
      },
    });

    const fileCount = archiveContents.length;

    // Successful verification
    const verificationResult: VerificationResult = {
      status: 'verified',
      file_count: fileCount,
      verification_time: verificationTime,
    };

    console.log(`Backup verified successfully: ${backupFileName} (${fileCount} files)`);
    return verificationResult;
  } catch (verificationError) {
    // Verification failed - archive is corrupted or unreadable
    const errorMessage =
      verificationError instanceof Error ? verificationError.message : String(verificationError);

    const verificationResult: VerificationResult = {
      status: 'failed',
      file_count: 0,
      verification_time: verificationTime,
      error: errorMessage,
    };

    console.error(`Backup verification failed for ${backupFileName}:`, errorMessage);
    return verificationResult;
  }
}

// ============================================================================
// Backup CRUD Operations
// ============================================================================

/**
 * Creates a compressed backup archive of ARK save files.
 * Generates timestamped filename and creates tar.gz archive.
 *
 * @param {BackupSettings} _currentSettings - Active backup configuration (unused, kept for API compatibility)
 * @param {string} [notes] - Optional user-provided notes for this backup
 * @returns {Promise<string>} Name of the created backup file
 * @async
 */
export async function createBackup(_currentSettings: BackupSettings, notes?: string): Promise<string> {
  const currentDate = new Date();
  const timestampFormatted = currentDate
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '-')
    .slice(0, 15);

  const backupArchiveName = `saves-${timestampFormatted}.tar.gz`;
  const backupArchiveFullPath = path.join(BACKUP_STORAGE_DIRECTORY, backupArchiveName);

  // Create compressed tar archive
  await tar.create(
    {
      gzip: true,
      file: backupArchiveFullPath,
      cwd: ARK_SAVE_DIRECTORY,
    },
    ['.']
  );

  // Attempt to set correct file ownership (may fail without root privileges)
  try {
    await fs.chown(backupArchiveFullPath, PROCESS_USER_ID, PROCESS_GROUP_ID);
  } catch (chownError) {
    console.warn('Failed to change backup file ownership:', chownError);
  }

  console.log(`Backup created successfully: ${backupArchiveName}`);

  // Save notes if provided
  if (notes && notes.trim()) {
    await saveBackupNotes(backupArchiveName, notes.trim());
  }

  // Verify backup integrity
  console.log(`Verifying backup integrity: ${backupArchiveName}`);
  const verificationResult = await verifyBackupIntegrity(backupArchiveName);
  await saveVerificationResult(backupArchiveName, verificationResult);

  return backupArchiveName;
}

/**
 * Deletes oldest backup archives to maintain retention limit.
 * Only removes auto-generated backups (saves-*.tar.gz), preserving manual backups.
 *
 * @param {number} maximumBackupsToRetain - Number of recent backups to keep
 * @returns {Promise<void>}
 * @async
 */
export async function pruneOldBackupArchives(maximumBackupsToRetain: number): Promise<void> {
  try {
    const allFiles = await fs.readdir(BACKUP_STORAGE_DIRECTORY);
    const automaticBackupFiles = allFiles.filter(
      (fileName) => fileName.startsWith('saves-') && fileName.endsWith('.tar.gz')
    );

    // Collect file statistics for sorting
    const backupFilesWithMetadata: BackupFileEntry[] = await Promise.all(
      automaticBackupFiles.map(async (backupFileName): Promise<BackupFileEntry> => {
        const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupFileName);
        const fileStatistics = await fs.stat(backupFilePath);
        return {
          name: backupFileName,
          mtime: fileStatistics.mtimeMs,
          path: backupFilePath,
        };
      })
    );

    // Sort by modification time (newest first)
    backupFilesWithMetadata.sort(
      (firstBackup, secondBackup) => secondBackup.mtime - firstBackup.mtime
    );

    // Delete backups exceeding retention limit
    if (backupFilesWithMetadata.length > maximumBackupsToRetain) {
      for (const oldBackup of backupFilesWithMetadata.slice(maximumBackupsToRetain)) {
        try {
          // Delete the backup archive
          await fs.unlink(oldBackup.path);
          console.log(`Pruned old backup archive: ${oldBackup.name}`);

          // Delete associated metadata files if they exist
          const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${oldBackup.name}.meta.json`);
          const verificationFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${oldBackup.name}.verify.json`);

          try {
            await fs.unlink(metadataFilePath);
          } catch (metaDeleteError) {
            // Metadata file may not exist - this is fine
          }

          try {
            await fs.unlink(verificationFilePath);
          } catch (verifyDeleteError) {
            // Verification file may not exist - this is fine
          }
        } catch (deleteError) {
          console.warn(`Failed to delete backup ${oldBackup.name}:`, deleteError);
        }
      }
    }
  } catch (pruneError) {
    console.error('Failed to prune old backups:', pruneError);
  }
}

/**
 * Lists all automatic backup archives with metadata.
 * Returns sorted array of backup files with size, timestamps, and verification status.
 *
 * @returns {Promise<BackupMetadata[]>} Array of backup metadata sorted by date (newest first)
 * @async
 */
export async function listAvailableBackups(): Promise<BackupMetadata[]> {
  try {
    const allFiles = await fs.readdir(BACKUP_STORAGE_DIRECTORY);
    const automaticBackupFiles = allFiles.filter(
      (fileName) => fileName.startsWith('saves-') && fileName.endsWith('.tar.gz')
    );

    const backupsWithMetadata = await Promise.all(
      automaticBackupFiles.map(async (backupFileName) => {
        const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupFileName);
        const fileStatistics = await fs.stat(backupFilePath);
        const verificationResult = await loadVerificationResult(backupFileName);

        // Load metadata (notes and tags)
        const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupFileName}.meta.json`);
        let backupNotes: string | undefined;
        let backupTags: string[] | undefined;
        try {
          const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
          const metadata = JSON.parse(metadataContent) as { notes?: string; tags?: string[] };
          backupNotes = metadata.notes;
          backupTags = metadata.tags;
        } catch (metadataLoadError) {
          // Metadata file doesn't exist or is invalid - this is normal for backups without notes/tags
        }

        const backupMetadata: BackupMetadata = {
          name: backupFileName,
          size_bytes: fileStatistics.size,
          mtime: fileStatistics.mtimeMs / 1000, // Convert milliseconds to seconds
          notes: backupNotes,
          tags: backupTags,
        };

        // Add verification data if available
        if (verificationResult) {
          backupMetadata.verification_status = verificationResult.status;
          backupMetadata.verification_time = verificationResult.verification_time;
          backupMetadata.verified_file_count = verificationResult.file_count;
          backupMetadata.verification_error = verificationResult.error;
        } else {
          backupMetadata.verification_status = 'unknown';
        }

        return backupMetadata;
      })
    );

    // Sort by modification time descending (newest first)
    backupsWithMetadata.sort((firstBackup, secondBackup) => secondBackup.mtime - firstBackup.mtime);

    return backupsWithMetadata;
  } catch (listError) {
    console.error('Failed to list backups:', listError);
    throw listError;
  }
}

/**
 * Deletes a specific backup archive and its associated metadata files.
 *
 * @param {string} backupName - Name of the backup to delete
 * @returns {Promise<void>}
 * @async
 */
export async function deleteBackup(backupName: string): Promise<void> {
  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupName);

  // Delete the backup archive
  await fs.unlink(backupFilePath);

  // Delete associated metadata files if they exist
  const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupName}.meta.json`);
  const verificationFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupName}.verify.json`);

  try {
    await fs.unlink(metadataFilePath);
  } catch (metaDeleteError) {
    // Metadata file may not exist - this is fine
  }

  try {
    await fs.unlink(verificationFilePath);
  } catch (verifyDeleteError) {
    // Verification file may not exist - this is fine
  }
}

// ============================================================================
// Restore Operations
// ============================================================================

/**
 * Creates a pre-restore safety backup of the current ARK save state.
 * Generates a timestamped backup with "pre-restore-" prefix.
 *
 * @returns {Promise<string>} Name of the created safety backup file
 * @async
 */
export async function createPreRestoreSafetyBackup(): Promise<string> {
  const currentTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .slice(0, 19)
    .replace(/-/g, (_matchedCharacter, characterOffset) => (characterOffset < 10 ? '' : '-'));

  const safetyBackupName = `pre-restore-${currentTimestamp}.tar.gz`;
  const safetyBackupPath = path.join(BACKUP_STORAGE_DIRECTORY, safetyBackupName);

  // Ensure backup directory exists
  await fs.mkdir(BACKUP_STORAGE_DIRECTORY, { recursive: true });

  // Create compressed tar archive of current state
  await tar.create(
    {
      gzip: true,
      file: safetyBackupPath,
      cwd: ARK_SAVE_DIRECTORY,
    },
    ['.']
  );

  // Attempt to set correct file ownership (may fail without root privileges)
  try {
    await fs.chown(safetyBackupPath, PROCESS_USER_ID, PROCESS_GROUP_ID);
  } catch (chownError) {
    console.warn('Failed to change safety backup file ownership:', chownError);
  }

  console.log(`Safety backup created: ${safetyBackupName}`);
  return safetyBackupName;
}
