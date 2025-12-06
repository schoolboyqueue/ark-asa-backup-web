/**
 * @fileoverview Backup domain data-access layer.
 * Handles all file system operations for backup management.
 *
 * **Layer:** Data-Access / Persistence
 * **Responsibility:** File system I/O for backup archives and metadata
 * **Dependencies:** File system, tar library
 * **Used By:** Backup service
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import tar from 'tar';
import type { VerificationResult, SaveInfo, BackupFileEntry } from './types.js';

/**
 * Saves backup metadata to a .meta.json file.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 * @param notes - User-provided notes
 * @param tags - Array of tags
 * @param saveInfo - Optional extracted save information
 */
export async function saveMetadata(
  backupDir: string,
  backupFileName: string,
  notes: string,
  tags: string[],
  saveInfo?: SaveInfo
): Promise<void> {
  const metadataFilePath = path.join(backupDir, `${backupFileName}.meta.json`);

  const backupMetadata = {
    name: backupFileName,
    created_at: Math.floor(Date.now() / 1000),
    notes: notes || undefined,
    tags: tags.length > 0 ? tags : undefined,
    save_info: saveInfo || undefined,
  };

  await fs.writeFile(metadataFilePath, JSON.stringify(backupMetadata, null, 2), 'utf-8');
}

/**
 * Loads backup metadata from a .meta.json file.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 * @returns Metadata object or undefined if file doesn't exist
 */
export async function loadMetadata(
  backupDir: string,
  backupFileName: string
): Promise<Record<string, unknown> | undefined> {
  const metadataFilePath = path.join(backupDir, `${backupFileName}.meta.json`);

  try {
    const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
    return JSON.parse(metadataContent);
  } catch {
    return undefined;
  }
}

/**
 * Saves verification result to a .verify.json file.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 * @param verificationResult - Verification result data
 */
export async function saveVerification(
  backupDir: string,
  backupFileName: string,
  verificationResult: VerificationResult
): Promise<void> {
  const verificationFilePath = path.join(backupDir, `${backupFileName}.verify.json`);
  await fs.writeFile(verificationFilePath, JSON.stringify(verificationResult, null, 2), 'utf-8');
}

/**
 * Loads verification result from a .verify.json file.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 * @returns Verification result or null if file doesn't exist
 */
export async function loadVerification(
  backupDir: string,
  backupFileName: string
): Promise<VerificationResult | null> {
  const verificationFilePath = path.join(backupDir, `${backupFileName}.verify.json`);

  try {
    const verificationContent = await fs.readFile(verificationFilePath, 'utf-8');
    return JSON.parse(verificationContent) as VerificationResult;
  } catch {
    return null;
  }
}

/**
 * Lists all backup files in a directory.
 *
 * @param backupDir - Directory where backups are stored
 * @returns Array of backup file entries sorted by modification time (newest first)
 */
export async function listBackupFiles(backupDir: string): Promise<BackupFileEntry[]> {
  const files = await fs.readdir(backupDir);
  const backupFiles = files.filter((file) => file.endsWith('.tar.gz'));

  const fileEntries = await Promise.all(
    backupFiles.map(async (file) => {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        mtime: stats.mtimeMs,
        path: filePath,
      };
    })
  );

  // Sort by modification time, newest first
  return fileEntries.sort((a, b) => b.mtime - a.mtime);
}

/**
 * Verifies backup integrity by listing tar contents.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 * @returns Verification result with file count
 */
export async function verifyIntegrity(
  backupDir: string,
  backupFileName: string
): Promise<VerificationResult> {
  const backupFilePath = path.join(backupDir, backupFileName);
  const verificationTime = Math.floor(Date.now() / 1000);

  try {
    let fileCount = 0;

    await tar.list({
      file: backupFilePath,
      onentry: () => {
        fileCount++;
      },
    });

    return {
      status: 'verified',
      file_count: fileCount,
      verification_time: verificationTime,
    };
  } catch (error) {
    return {
      status: 'failed',
      file_count: 0,
      verification_time: verificationTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deletes a backup file and its associated metadata files.
 *
 * @param backupDir - Directory where backups are stored
 * @param backupFileName - Name of the backup archive
 */
export async function deleteBackupFile(backupDir: string, backupFileName: string): Promise<void> {
  const backupFilePath = path.join(backupDir, backupFileName);
  const metadataFilePath = path.join(backupDir, `${backupFileName}.meta.json`);
  const verificationFilePath = path.join(backupDir, `${backupFileName}.verify.json`);

  await fs.unlink(backupFilePath);

  // Delete metadata files if they exist
  try {
    await fs.unlink(metadataFilePath);
  } catch {
    // Ignore if metadata file doesn't exist
  }

  try {
    await fs.unlink(verificationFilePath);
  } catch {
    // Ignore if verification file doesn't exist
  }
}

/**
 * Creates a tar.gz backup archive from a source directory.
 *
 * @param sourceDir - Directory to backup
 * @param backupDir - Directory where backup will be stored
 * @param backupFileName - Name for the backup archive
 */
export async function createArchive(
  sourceDir: string,
  backupDir: string,
  backupFileName: string
): Promise<void> {
  const backupFilePath = path.join(backupDir, backupFileName);

  await tar.create(
    {
      gzip: true,
      file: backupFilePath,
      cwd: sourceDir,
    },
    ['.']
  );
}
