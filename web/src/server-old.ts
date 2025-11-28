/**
 * @fileoverview ARK ASA Backup Manager - Express/TypeScript Server
 * Unified Node.js backend providing REST API for backup management and server control.
 * Implements automated backup scheduling, Docker container management, and file operations.
 *
 * Architecture:
 * - RESTful API endpoints for frontend communication
 * - Background backup loop with configurable intervals
 * - Docker API integration for server management
 * - File-based configuration persistence
 *
 * Design Patterns:
 * - Singleton: Single Express app instance and Docker client
 * - Observer: Background loop observes timer and triggers backups
 * - Repository: File system abstraction for backups and settings
 * - Facade: Simplified Docker API interface
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import Dockerode from 'dockerode';
import tar from 'tar';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module __dirname equivalent
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);

// ============================================================================
// Configuration Constants
// ============================================================================

/** Path to persistent configuration file */
const CONFIGURATION_FILE_PATH = '/config/settings.env';

/** Directory for storing backup archives */
const BACKUP_STORAGE_DIRECTORY = '/backups';

/** Directory containing ARK save files */
const ARK_SAVE_DIRECTORY = '/save';

/** Unix socket path for Docker daemon */
const DOCKER_DAEMON_SOCKET = '/var/run/docker.sock';

/** Name/ID of the ARK server Docker container */
const ARK_SERVER_CONTAINER_NAME = process.env.ARK_BACKUP_CONTAINER_NAME || 'ark-asa';

/** HTTP server port */
const HTTP_SERVER_PORT = parseInt(process.env.PORT || '8080', 10);

/** Process user ID for file ownership */
const PROCESS_USER_ID = parseInt(process.env.PUID || '1000', 10);

/** Process group ID for file ownership */
const PROCESS_GROUP_ID = parseInt(process.env.PGID || '1000', 10);

/** Minimum allowed backup interval in seconds (1 minute) */
const MINIMUM_BACKUP_INTERVAL_SECONDS = 60;

/** Minimum allowed backup retention count */
const MINIMUM_BACKUP_RETENTION_COUNT = 1;

/** Minimum wait time between backup loop iterations in milliseconds */
const MINIMUM_LOOP_WAIT_MILLISECONDS = 60000;

/** Docker container stop timeout in seconds */
const CONTAINER_STOP_TIMEOUT_SECONDS = 60;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Backup configuration settings interface.
 * @interface BackupSettings
 */
interface BackupSettings {
  /** Interval between automatic backups in seconds */
  BACKUP_INTERVAL: number;
  /** Maximum number of backup archives to retain */
  MAX_BACKUPS: number;
  /** Whether to automatically create pre-restore safety backups (default: true) */
  AUTO_SAFETY_BACKUP?: boolean;
}

/**
 * Backup file metadata interface.
 * @interface BackupMetadata
 */
interface BackupMetadata {
  /** Filename of the backup archive */
  name: string;
  /** File size in bytes */
  size_bytes: number;
  /** Modification time as Unix timestamp in seconds */
  mtime: number;
  /** Optional human-readable timestamp */
  mtime_human?: string;
  /** Optional user-provided notes or tags for this backup */
  notes?: string;
  /** Verification status of the backup archive */
  verification_status?: 'verified' | 'failed' | 'pending' | 'unknown';
  /** Timestamp when verification was last performed (Unix timestamp in seconds) */
  verification_time?: number;
  /** Number of files extracted during verification */
  verified_file_count?: number;
  /** Error message if verification failed */
  verification_error?: string;
}

/**
 * Internal backup file entry with filesystem statistics.
 * Used for sorting and pruning operations.
 * @interface BackupFileEntry
 */
interface BackupFileEntry {
  /** Filename */
  name: string;
  /** Modification time in milliseconds */
  mtime: number;
  /** Full file path */
  path: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Fallback backup settings used when configuration file is unavailable.
 */
const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  BACKUP_INTERVAL: 1800, // 30 minutes
  MAX_BACKUPS: 2,
  AUTO_SAFETY_BACKUP: true, // Enabled by default for safety
};

// ============================================================================
// Application Initialization
// ============================================================================

/** Express application instance */
const expressApplication = express();

/** Enable JSON request body parsing */
expressApplication.use(express.json());

/** Serve React application static files */
expressApplication.use(express.static(path.join(currentDirectoryPath, '../static/dist')));

/** Docker client instance for container management */
const dockerClient = new Dockerode({ socketPath: DOCKER_DAEMON_SOCKET });

/**
 * HTTP request logging middleware.
 * Logs timestamp, method, and path for every incoming request.
 */
expressApplication.use((httpRequest: Request, _httpResponse: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${httpRequest.method} ${httpRequest.path}`);
  next();
});

// ============================================================================
// Settings Management
// ============================================================================

/**
 * Loads backup configuration from disk with validation and fallback.
 * Parses environment-style configuration file and applies constraints.
 *
 * @returns {Promise<BackupSettings>} Validated backup configuration
 * @async
 */
async function loadBackupSettings(): Promise<BackupSettings> {
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
    console.warn('Failed to load configuration settings, using defaults:', error);
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
async function saveBackupSettings(
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

// ============================================================================
// Backup Operations
// ============================================================================

/**
 * Verification result interface containing status and details.
 * @interface VerificationResult
 */
interface VerificationResult {
  /** Verification status */
  status: 'verified' | 'failed' | 'pending' | 'unknown';
  /** Number of files found in archive */
  file_count: number;
  /** Unix timestamp when verification was performed */
  verification_time: number;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Saves backup notes to a JSON metadata file alongside the backup archive.
 * Metadata files are named with .meta.json extension (e.g., saves-20240115-120000.tar.gz.meta.json)
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @param {string} notes - User-provided notes or tags for the backup
 * @returns {Promise<void>}
 * @async
 */
async function saveBackupNotes(backupFileName: string, notes: string): Promise<void> {
  const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupFileName}.meta.json`);
  const metadataContent = { notes };

  try {
    await fs.writeFile(metadataFilePath, JSON.stringify(metadataContent, null, 2), 'utf-8');

    // Attempt to set correct file ownership
    try {
      await fs.chown(metadataFilePath, PROCESS_USER_ID, PROCESS_GROUP_ID);
    } catch (chownError) {
      console.warn('Failed to change metadata file ownership:', chownError);
    }
  } catch (saveError) {
    console.error(`Failed to save backup notes for ${backupFileName}:`, saveError);
  }
}

/**
 * Loads backup notes from a JSON metadata file if it exists.
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @returns {Promise<string | undefined>} Notes string if metadata exists, undefined otherwise
 * @async
 */
async function loadBackupNotes(backupFileName: string): Promise<string | undefined> {
  const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupFileName}.meta.json`);

  try {
    const metadataContent = await fs.readFile(metadataFilePath, 'utf-8');
    const metadata = JSON.parse(metadataContent);
    return metadata.notes;
  } catch (loadError) {
    // Metadata file doesn't exist or is invalid - this is normal for backups without notes
    return undefined;
  }
}

/**
 * Saves verification result to a JSON metadata file alongside the backup archive.
 * Verification files are named with .verify.json extension (e.g., saves-20240115-120000.tar.gz.verify.json)
 *
 * @param {string} backupFileName - Name of the backup archive file
 * @param {VerificationResult} verificationResult - Verification result data
 * @returns {Promise<void>}
 * @async
 */
async function saveVerificationResult(
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
async function loadVerificationResult(backupFileName: string): Promise<VerificationResult | null> {
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
async function verifyBackupIntegrity(backupFileName: string): Promise<VerificationResult> {
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

/**
 * Creates a compressed backup archive of ARK save files and prunes old backups.
 * Generates timestamped filename, creates tar.gz archive, and triggers cleanup.
 *
 * @param {BackupSettings} currentSettings - Active backup configuration
 * @param {string} [notes] - Optional user-provided notes for this backup
 * @returns {Promise<number>} Interval in seconds until next backup
 * @async
 */
async function executeBackupAndPrune(currentSettings: BackupSettings, notes?: string): Promise<number> {
  const backupIntervalSeconds = currentSettings.BACKUP_INTERVAL;
  const maximumBackupsToRetain = currentSettings.MAX_BACKUPS;

  const currentTimestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .slice(0, 19)
    .replace(/-/g, (_matchedCharacter, characterOffset) => (characterOffset < 10 ? '' : '-'));

  const backupArchiveName = `saves-${currentTimestamp}.tar.gz`;
  const backupArchiveFullPath = path.join(BACKUP_STORAGE_DIRECTORY, backupArchiveName);

  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_STORAGE_DIRECTORY, { recursive: true });

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

    // Update health tracking - successful backup
    lastSuccessfulBackupTime = Math.floor(Date.now() / 1000);
    lastBackupError = null;

    // Remove old backups exceeding retention limit
    await pruneOldBackupArchives(maximumBackupsToRetain);
  } catch (backupError) {
    console.error('Backup operation failed:', backupError);

    // Update health tracking - failed backup
    lastFailedBackupTime = Math.floor(Date.now() / 1000);
    lastBackupError = backupError instanceof Error ? backupError.message : String(backupError);
  }

  return backupIntervalSeconds;
}

/**
 * Deletes oldest backup archives to maintain retention limit.
 * Only removes auto-generated backups (saves-*.tar.gz), preserving manual backups.
 *
 * @param {number} maximumBackupsToRetain - Number of recent backups to keep
 * @returns {Promise<void>}
 * @async
 */
async function pruneOldBackupArchives(maximumBackupsToRetain: number): Promise<void> {
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
 * Returns sorted array of backup files with size and timestamps.
 *
 * @returns {Promise<BackupMetadata[]>} Array of backup metadata sorted by date (newest first)
 * @async
 */
async function listAvailableBackups(): Promise<BackupMetadata[]> {
  try {
    const allFiles = await fs.readdir(BACKUP_STORAGE_DIRECTORY);
    const automaticBackupFiles = allFiles.filter(
      (fileName) => fileName.startsWith('saves-') && fileName.endsWith('.tar.gz')
    );

    const backupsWithMetadata = await Promise.all(
      automaticBackupFiles.map(async (backupFileName) => {
        const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupFileName);
        const fileStatistics = await fs.stat(backupFilePath);
        const backupNotes = await loadBackupNotes(backupFileName);
        const verificationResult = await loadVerificationResult(backupFileName);

        const backupMetadata: BackupMetadata = {
          name: backupFileName,
          size_bytes: fileStatistics.size,
          mtime: fileStatistics.mtimeMs / 1000, // Convert milliseconds to seconds
          notes: backupNotes,
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
    console.error('Failed to list backup archives:', listError);
    return [];
  }
}

// ============================================================================
// Docker Container Management
// ============================================================================

/**
 * Retrieves the ARK server Docker container instance if it exists.
 * Verifies container existence by attempting inspection.
 *
 * @returns {Promise<Dockerode.Container | null>} Container instance or null if not found
 * @async
 */
async function getArkServerContainer(): Promise<Dockerode.Container | null> {
  try {
    const containerInstance = dockerClient.getContainer(ARK_SERVER_CONTAINER_NAME);
    // Verify container exists by inspecting it
    await containerInstance.inspect();
    return containerInstance;
  } catch (containerError) {
    return null;
  }
}

// ============================================================================
// Background Backup Scheduler
// ============================================================================

/** Flag to control backup loop execution */
let isBackupLoopActive = false;

/** Timestamp of last successful backup (Unix timestamp in seconds) */
let lastSuccessfulBackupTime: number | null = null;

/** Timestamp of last failed backup (Unix timestamp in seconds) */
let lastFailedBackupTime: number | null = null;

/** Error message from last failed backup */
let lastBackupError: string | null = null;

/**
 * Infinite background loop that executes backups on schedule.
 * Reloads configuration before each iteration to respect runtime changes.
 * Continues running until explicitly stopped via signal handlers.
 *
 * @returns {Promise<void>}
 * @async
 */
async function runBackupSchedulerLoop(): Promise<void> {
  isBackupLoopActive = true;
  console.log('Backup scheduler loop started');

  while (isBackupLoopActive) {
    try {
      const currentSettings = await loadBackupSettings();
      const nextBackupIntervalSeconds = await executeBackupAndPrune(currentSettings);
      const waitTimeMilliseconds = Math.max(
        MINIMUM_LOOP_WAIT_MILLISECONDS,
        nextBackupIntervalSeconds * 1000
      );

      console.log(`Next backup scheduled in ${waitTimeMilliseconds / 1000} seconds`);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, waitTimeMilliseconds));
    } catch (loopError) {
      console.error('Backup scheduler loop error:', loopError);
      // Wait before retrying to avoid rapid failure loops
      await new Promise((resolvePromise) =>
        setTimeout(resolvePromise, MINIMUM_LOOP_WAIT_MILLISECONDS)
      );
    }
  }
}

// Start background backup scheduler
runBackupSchedulerLoop();

// ============================================================================
// HTTP API Routes
// ============================================================================

/**
 * Health check endpoint for monitoring.
 * @route GET /health
 */
expressApplication.get('/health', (_httpRequest: Request, httpResponse: Response) => {
  httpResponse.status(200).send('OK');
  return;
});

/**
 * Backup system health status endpoint.
 * Returns scheduler status and backup success/failure information.
 * @route GET /api/backup/health
 */
expressApplication.get('/api/backup/health', (_httpRequest: Request, httpResponse: Response) => {
  httpResponse.json({
    ok: true,
    scheduler_active: isBackupLoopActive,
    last_successful_backup: lastSuccessfulBackupTime,
    last_failed_backup: lastFailedBackupTime,
    last_error: lastBackupError,
  });
  return;
});

/**
 * Retrieves current backup configuration settings.
 * @route GET /api/settings
 */
expressApplication.get('/api/settings', async (_httpRequest: Request, httpResponse: Response) => {
  const currentSettings = await loadBackupSettings();
  httpResponse.json(currentSettings);
  return;
});

/**
 * Updates backup configuration settings.
 * Validates input and triggers immediate pruning with new retention limit.
 * @route POST /api/settings
 */
expressApplication.post('/api/settings', async (httpRequest: Request, httpResponse: Response) => {
  const { BACKUP_INTERVAL, MAX_BACKUPS, AUTO_SAFETY_BACKUP } = httpRequest.body;

  const newBackupInterval =
    parseInt(BACKUP_INTERVAL, 10) || DEFAULT_BACKUP_SETTINGS.BACKUP_INTERVAL;
  const newMaxBackups = parseInt(MAX_BACKUPS, 10) || DEFAULT_BACKUP_SETTINGS.MAX_BACKUPS;
  const newAutoSafetyBackup =
    AUTO_SAFETY_BACKUP !== undefined ? Boolean(AUTO_SAFETY_BACKUP) : true;

  await saveBackupSettings(newBackupInterval, newMaxBackups, newAutoSafetyBackup);
  await pruneOldBackupArchives(newMaxBackups);

  const updatedSettings = await loadBackupSettings();
  httpResponse.json({ ok: true, settings: updatedSettings });
  return;
});

/**
 * Lists all available backup archives with metadata.
 * @route GET /api/backups
 */
expressApplication.get('/api/backups', async (_httpRequest: Request, httpResponse: Response) => {
  const availableBackups = await listAvailableBackups();
  httpResponse.json(availableBackups);
  return;
});

/**
 * Triggers an immediate manual backup outside the normal schedule.
 * Creates a backup archive and prunes old backups according to current settings.
 * Accepts optional notes field for user-provided backup description.
 * @route POST /api/backups/trigger
 */
expressApplication.post(
  '/api/backups/trigger',
  async (httpRequest: Request, httpResponse: Response) => {
    try {
      const { notes } = httpRequest.body;
      const currentSettings = await loadBackupSettings();
      await executeBackupAndPrune(currentSettings, notes);
      const updatedBackupsList = await listAvailableBackups();
      httpResponse.json({ ok: true, backups: updatedBackupsList });
      return;
    } catch (backupError) {
      console.error('Manual backup trigger failed:', backupError);
      httpResponse
        .status(500)
        .json({ ok: false, error: `backup failed: ${backupError}` });
      return;
    }
  }
);

/**
 * Updates the notes for an existing backup.
 * Updates or creates the .meta.json file for the specified backup.
 * @route PUT /api/backups/notes
 */
expressApplication.put(
  '/api/backups/notes',
  async (httpRequest: Request, httpResponse: Response) => {
    try {
      const { backup_name, notes } = httpRequest.body;

      if (!backup_name) {
        httpResponse.status(400).json({ ok: false, error: 'backup_name is required' });
        return;
      }

      // Verify backup exists
      const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backup_name);
      try {
        await fs.access(backupFilePath);
      } catch (accessError) {
        httpResponse.status(404).json({ ok: false, error: 'Backup not found' });
        return;
      }

      // Save or remove notes
      if (notes !== undefined && notes.trim()) {
        await saveBackupNotes(backup_name, notes.trim());
      } else {
        // Remove metadata file if notes are empty
        const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backup_name}.meta.json`);
        try {
          await fs.unlink(metadataFilePath);
        } catch (unlinkError) {
          // Ignore error if metadata file doesn't exist
        }
      }

      httpResponse.json({ ok: true });
      return;
    } catch (updateError) {
      console.error('Failed to update backup notes:', updateError);
      httpResponse
        .status(500)
        .json({ ok: false, error: `Failed to update notes: ${updateError}` });
      return;
    }
  }
);

/**
 * Manually verifies a backup archive integrity.
 * Tests that the tar.gz file is readable, counts files, and saves verification result.
 * @route POST /api/backups/:backupName/verify
 */
expressApplication.post(
  '/api/backups/:backupName/verify',
  async (httpRequest: Request, httpResponse: Response) => {
    try {
      const backupNameToVerify = httpRequest.params.backupName;

      if (!backupNameToVerify) {
        httpResponse.status(400).json({ ok: false, error: 'backup_name is required' });
        return;
      }

      // Verify backup exists
      const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToVerify);
      try {
        await fs.access(backupFilePath);
      } catch (accessError) {
        httpResponse.status(404).json({ ok: false, error: 'Backup not found' });
        return;
      }

      // Run verification
      console.log(`Manual verification requested for: ${backupNameToVerify}`);
      const verificationResult = await verifyBackupIntegrity(backupNameToVerify);
      await saveVerificationResult(backupNameToVerify, verificationResult);

      httpResponse.json({
        ok: true,
        verification: verificationResult,
      });
      return;
    } catch (verificationError) {
      console.error('Manual verification failed:', verificationError);
      httpResponse
        .status(500)
        .json({
          ok: false,
          error: `Verification failed: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`,
        });
      return;
    }
  }
);

/**
 * Helper function to retrieve disk space information.
 * @returns {Promise<object>} Disk space statistics
 * @async
 */
async function retrieveDiskSpaceInfo(): Promise<{
  ok: boolean;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
}> {
  const diskSpaceStats = await fs.statfs(BACKUP_STORAGE_DIRECTORY);
  const totalBytes = diskSpaceStats.blocks * diskSpaceStats.bsize;
  const freeBytes = diskSpaceStats.bfree * diskSpaceStats.bsize;
  const availableBytes = diskSpaceStats.bavail * diskSpaceStats.bsize;
  const usedBytes = totalBytes - freeBytes;

  return {
    ok: true,
    total_bytes: totalBytes,
    used_bytes: usedBytes,
    available_bytes: availableBytes,
    used_percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
  };
}

/**
 * Retrieves disk space information for the backup storage directory.
 * Returns total, used, and available disk space in bytes.
 * @route GET /api/disk-space
 */
expressApplication.get('/api/disk-space', async (_httpRequest: Request, httpResponse: Response) => {
  try {
    const diskSpaceInfo = await retrieveDiskSpaceInfo();
    httpResponse.json(diskSpaceInfo);
    return;
  } catch (diskSpaceError) {
    console.error('Failed to retrieve disk space:', diskSpaceError);
    httpResponse.status(500).json({ ok: false, error: `disk space retrieval failed: ${diskSpaceError}` });
    return;
  }
});

/**
 * Deletes a specific backup archive.
 * @route POST /api/delete
 */
expressApplication.post('/api/delete', async (httpRequest: Request, httpResponse: Response) => {
  const { backup_name: backupNameToDelete } = httpRequest.body;

  if (!backupNameToDelete) {
    httpResponse.status(400).json({ ok: false, error: 'backup_name is required' });
    return;
  }

  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToDelete);

  try {
    await fs.access(backupFilePath);

    // Delete the backup archive
    await fs.unlink(backupFilePath);

    // Delete associated metadata files if they exist
    const metadataFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupNameToDelete}.meta.json`);
    const verificationFilePath = path.join(BACKUP_STORAGE_DIRECTORY, `${backupNameToDelete}.verify.json`);

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

    httpResponse.json({ ok: true });
    return;
  } catch (deleteError) {
    if ((deleteError as NodeJS.ErrnoException).code === 'ENOENT') {
      httpResponse.status(404).json({ ok: false, error: 'backup not found' });
      return;
    } else {
      httpResponse.status(500).json({ ok: false, error: `delete failed: ${deleteError}` });
      return;
    }
  }
});

/**
 * Downloads a backup archive file.
 * Streams the backup file to the client for local storage.
 * @route GET /api/download/:backupName
 */
expressApplication.get('/api/download/:backupName', async (httpRequest: Request, httpResponse: Response) => {
  const backupNameToDownload = httpRequest.params.backupName;

  if (!backupNameToDownload) {
    httpResponse.status(400).json({ ok: false, error: 'backup name is required' });
    return;
  }

  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToDownload);

  try {
    // Verify backup file exists
    await fs.access(backupFilePath);
    const fileStats = await fs.stat(backupFilePath);

    // Set headers for file download
    httpResponse.setHeader('Content-Type', 'application/gzip');
    httpResponse.setHeader('Content-Disposition', `attachment; filename="${backupNameToDownload}"`);
    httpResponse.setHeader('Content-Length', fileStats.size);

    // Stream the file to the client
    const fileStream = createReadStream(backupFilePath);
    fileStream.pipe(httpResponse);

    fileStream.on('error', (streamError: Error) => {
      console.error('Error streaming backup file:', streamError);
      if (!httpResponse.headersSent) {
        httpResponse.status(500).json({ ok: false, error: `download failed: ${streamError.message}` });
      }
    });
  } catch (downloadError) {
    if ((downloadError as NodeJS.ErrnoException).code === 'ENOENT') {
      httpResponse.status(404).json({ ok: false, error: 'backup not found' });
      return;
    } else {
      httpResponse.status(500).json({ ok: false, error: `download failed: ${downloadError}` });
      return;
    }
  }
});

/**
 * Creates a safety backup before restore operations.
 * Generates a pre-restore snapshot with 'pre-restore-' prefix for easy identification.
 *
 * @returns {Promise<string>} Name of the created safety backup
 * @throws {Error} If safety backup creation fails
 * @async
 */
async function createPreRestoreSafetyBackup(): Promise<string> {
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

/**
 * Restores a backup archive to the ARK save directory with Server-Sent Events progress.
 * Optionally creates a pre-restore safety backup based on AUTO_SAFETY_BACKUP setting.
 * WARNING: Deletes all current save files after optional safety backup, then extracts restore archive.
 * @route POST /api/restore
 */
expressApplication.post('/api/restore', async (httpRequest: Request, httpResponse: Response) => {
  const { backup_name: backupNameToRestore } = httpRequest.body;

  if (!backupNameToRestore) {
    httpResponse.status(400).json({ ok: false, error: 'backup_name is required' });
    return;
  }

  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToRestore);

  // Set up SSE headers
  httpResponse.setHeader('Content-Type', 'text/event-stream');
  httpResponse.setHeader('Cache-Control', 'no-cache');
  httpResponse.setHeader('Connection', 'keep-alive');
  httpResponse.flushHeaders();

  /**
   * Sends a Server-Sent Event to the client.
   * @param {string} eventType - The event type
   * @param {object} eventData - The event data
   */
  const sendProgressEvent = (eventType: string, eventData: Record<string, unknown>): void => {
    httpResponse.write(`event: ${eventType}\n`);
    httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  try {
    await fs.access(backupFilePath);

    sendProgressEvent('progress', { stage: 'starting', percent: 0 });

    // Load current settings to check auto safety backup preference
    const currentSettings = await loadBackupSettings();
    const shouldCreateSafetyBackup = currentSettings.AUTO_SAFETY_BACKUP !== false;

    let safetyBackupName: string | null = null;

    // Create safety backup if enabled
    if (shouldCreateSafetyBackup) {
      sendProgressEvent('progress', {
        stage: 'safety_backup',
        percent: 5,
        message: 'Creating pre-restore safety backup...',
      });

      try {
        safetyBackupName = await createPreRestoreSafetyBackup();
        sendProgressEvent('progress', {
          stage: 'safety_backup',
          percent: 15,
          message: `Safety backup created: ${safetyBackupName}`,
        });
      } catch (safetyBackupError) {
        sendProgressEvent('error', {
          ok: false,
          error: `Failed to create safety backup: ${safetyBackupError instanceof Error ? safetyBackupError.message : String(safetyBackupError)}`,
        });
        httpResponse.end();
        return;
      }
    } else {
      sendProgressEvent('progress', {
        stage: 'skipping_safety_backup',
        percent: 15,
        message: 'Skipping safety backup (disabled in settings)',
      });
    }

    // Clear all current save files
    const existingSaveFiles = await fs.readdir(ARK_SAVE_DIRECTORY);
    const totalFilesToDelete = existingSaveFiles.length;

    sendProgressEvent('progress', {
      stage: 'deleting',
      percent: 20,
      message: `Deleting ${totalFilesToDelete} existing files...`,
    });

    for (let fileIndex = 0; fileIndex < existingSaveFiles.length; fileIndex++) {
      const saveFileName = existingSaveFiles[fileIndex];
      const saveFilePath = path.join(ARK_SAVE_DIRECTORY, saveFileName);
      const fileStatistics = await fs.stat(saveFilePath);

      if (fileStatistics.isDirectory()) {
        await fs.rm(saveFilePath, { recursive: true });
      } else {
        await fs.unlink(saveFilePath);
      }

      // Update progress for deletion phase (20% to 50%)
      const deletionProgress = 20 + ((fileIndex + 1) / totalFilesToDelete) * 30;
      sendProgressEvent('progress', {
        stage: 'deleting',
        percent: Math.round(deletionProgress),
        message: `Deleted ${fileIndex + 1}/${totalFilesToDelete} files`,
      });
    }

    sendProgressEvent('progress', {
      stage: 'extracting',
      percent: 50,
      message: 'Extracting backup archive...',
    });

    // Extract backup archive
    await tar.extract({
      file: backupFilePath,
      cwd: ARK_SAVE_DIRECTORY,
    });

    sendProgressEvent('progress', { stage: 'complete', percent: 100, message: 'Restore complete!' });
    sendProgressEvent('done', { ok: true, safety_backup: safetyBackupName });

    httpResponse.end();
  } catch (restoreError) {
    if ((restoreError as NodeJS.ErrnoException).code === 'ENOENT') {
      sendProgressEvent('error', { ok: false, error: 'backup not found' });
    } else {
      sendProgressEvent('error', { ok: false, error: `restore failed: ${restoreError}` });
    }
    httpResponse.end();
  }
});

/**
 * Retrieves current ARK server container status.
 * @route GET /api/server/status
 */
expressApplication.get(
  '/api/server/status',
  async (_httpRequest: Request, httpResponse: Response) => {
    try {
      const arkContainer = await getArkServerContainer();

      if (!arkContainer) {
        httpResponse.status(404).json({
          ok: false,
          error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
        });
        return;
      }

      const containerInspectionData = await arkContainer.inspect();
      httpResponse.json({ ok: true, status: containerInspectionData.State.Status });
      return;
    } catch (statusError) {
      httpResponse.status(500).json({ ok: false, error: String(statusError) });
      return;
    }
  }
);

/**
 * Server-Sent Events stream for real-time server status updates.
 * Eliminates need for frontend polling by pushing status changes.
 * Polls Docker API every 2 seconds and sends updates when status changes.
 * @route GET /api/server/status/stream
 */
expressApplication.get(
  '/api/server/status/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    // Set up SSE headers
    httpResponse.setHeader('Content-Type', 'text/event-stream');
    httpResponse.setHeader('Cache-Control', 'no-cache');
    httpResponse.setHeader('Connection', 'keep-alive');
    httpResponse.flushHeaders();

    let previousStatus: string | null = null;
    let isStreamActive = true;

    /**
     * Sends a Server-Sent Event to the client.
     * @param {string} eventType - The event type
     * @param {object} eventData - The event data
     */
    const sendStatusEvent = (eventType: string, eventData: Record<string, unknown>): void => {
      httpResponse.write(`event: ${eventType}\n`);
      httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    // Send initial heartbeat
    sendStatusEvent('connected', { message: 'Status stream connected' });

    /**
     * Polls server status and sends updates when changes occur.
     */
    const pollServerStatus = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const arkContainer = await getArkServerContainer();

          if (!arkContainer) {
            sendStatusEvent('error', {
              ok: false,
              error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
            });
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
            continue;
          }

          const containerInspectionData = await arkContainer.inspect();
          const currentStatus = containerInspectionData.State.Status;

          // Only send update if status changed
          if (currentStatus !== previousStatus) {
            sendStatusEvent('status', { ok: true, status: currentStatus });
            previousStatus = currentStatus;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
        } catch (statusError) {
          sendStatusEvent('error', { ok: false, error: String(statusError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
        }
      }
    };

    // Handle client disconnect
    httpResponse.on('close', () => {
      isStreamActive = false;
      console.log('Status stream client disconnected');
    });

    // Start polling loop
    pollServerStatus();
  }
);

/**
 * Server-Sent Events stream for real-time backups list updates.
 * Polls filesystem every 3 seconds and sends updates when backups change.
 * @route GET /api/backups/stream
 */
expressApplication.get(
  '/api/backups/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    httpResponse.setHeader('Content-Type', 'text/event-stream');
    httpResponse.setHeader('Cache-Control', 'no-cache');
    httpResponse.setHeader('Connection', 'keep-alive');
    httpResponse.flushHeaders();

    let previousBackupsList: string | null = null;
    let isStreamActive = true;

    const sendBackupsEvent = (eventType: string, eventData: any): void => {
      httpResponse.write(`event: ${eventType}\n`);
      httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    sendBackupsEvent('connected', { message: 'Backups stream connected' });

    const pollBackupsList = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const backupFiles = await listAvailableBackups();
          const backupsListJson = JSON.stringify(backupFiles);

          if (backupsListJson !== previousBackupsList) {
            sendBackupsEvent('backups', backupFiles);
            previousBackupsList = backupsListJson;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
        } catch (backupsError) {
          sendBackupsEvent('error', { error: String(backupsError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
        }
      }
    };

    httpResponse.on('close', () => {
      isStreamActive = false;
      console.log('Backups stream client disconnected');
    });

    pollBackupsList();
  }
);

/**
 * Server-Sent Events stream for real-time backup health status updates.
 * Sends updates every 5 seconds with scheduler status and last backup info.
 * @route GET /api/backup/health/stream
 */
expressApplication.get(
  '/api/backup/health/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    httpResponse.setHeader('Content-Type', 'text/event-stream');
    httpResponse.setHeader('Cache-Control', 'no-cache');
    httpResponse.setHeader('Connection', 'keep-alive');
    httpResponse.flushHeaders();

    let previousHealthJson: string | null = null;
    let isStreamActive = true;

    const sendHealthEvent = (eventType: string, eventData: any): void => {
      httpResponse.write(`event: ${eventType}\n`);
      httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    sendHealthEvent('connected', { message: 'Backup health stream connected' });

    const pollBackupHealth = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const healthStatus = {
            ok: true,
            scheduler_active: isBackupLoopActive,
            last_successful_backup: lastSuccessfulBackupTime,
            last_failed_backup: lastFailedBackupTime,
            last_error: lastBackupError,
          };
          const healthJson = JSON.stringify(healthStatus);

          if (healthJson !== previousHealthJson) {
            sendHealthEvent('health', healthStatus);
            previousHealthJson = healthJson;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 5000));
        } catch (healthError) {
          sendHealthEvent('error', { ok: false, error: String(healthError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 5000));
        }
      }
    };

    httpResponse.on('close', () => {
      isStreamActive = false;
      console.log('Backup health stream client disconnected');
    });

    pollBackupHealth();
  }
);

/**
 * Server-Sent Events stream for real-time disk space updates.
 * Polls filesystem every 10 seconds and sends updates when disk usage changes.
 * @route GET /api/disk-space/stream
 */
expressApplication.get(
  '/api/disk-space/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    httpResponse.setHeader('Content-Type', 'text/event-stream');
    httpResponse.setHeader('Cache-Control', 'no-cache');
    httpResponse.setHeader('Connection', 'keep-alive');
    httpResponse.flushHeaders();

    let previousDiskSpaceJson: string | null = null;
    let isStreamActive = true;

    const sendDiskSpaceEvent = (eventType: string, eventData: any): void => {
      httpResponse.write(`event: ${eventType}\n`);
      httpResponse.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    sendDiskSpaceEvent('connected', { message: 'Disk space stream connected' });

    const pollDiskSpace = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const diskSpaceInfo = await retrieveDiskSpaceInfo();
          const diskSpaceJson = JSON.stringify(diskSpaceInfo);

          if (diskSpaceJson !== previousDiskSpaceJson) {
            sendDiskSpaceEvent('diskspace', diskSpaceInfo);
            previousDiskSpaceJson = diskSpaceJson;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 10000));
        } catch (diskSpaceError) {
          sendDiskSpaceEvent('error', { ok: false, error: String(diskSpaceError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 10000));
        }
      }
    };

    httpResponse.on('close', () => {
      isStreamActive = false;
      console.log('Disk space stream client disconnected');
    });

    pollDiskSpace();
  }
);

/**
 * Starts the ARK server Docker container.
 * @route POST /api/server/start
 */
expressApplication.post(
  '/api/server/start',
  async (_httpRequest: Request, httpResponse: Response) => {
    try {
      const arkContainer = await getArkServerContainer();

      if (!arkContainer) {
        httpResponse.status(404).json({
          ok: false,
          error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
        });
        return;
      }

      await arkContainer.start();
      const containerInspectionData = await arkContainer.inspect();
      httpResponse.json({ ok: true, status: containerInspectionData.State.Status });
      return;
    } catch (startError) {
      httpResponse.status(500).json({ ok: false, error: String(startError) });
      return;
    }
  }
);

/**
 * Stops the ARK server Docker container with graceful shutdown timeout.
 * @route POST /api/server/stop
 */
expressApplication.post(
  '/api/server/stop',
  async (_httpRequest: Request, httpResponse: Response) => {
    try {
      const arkContainer = await getArkServerContainer();

      if (!arkContainer) {
        httpResponse.status(404).json({
          ok: false,
          error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
        });
        return;
      }

      await arkContainer.stop({ t: CONTAINER_STOP_TIMEOUT_SECONDS });
      const containerInspectionData = await arkContainer.inspect();
      httpResponse.json({ ok: true, status: containerInspectionData.State.Status });
      return;
    } catch (stopError) {
      httpResponse.status(500).json({ ok: false, error: String(stopError) });
      return;
    }
  }
);

/**
 * Serves React SPA for all unmatched routes.
 * MUST be last route to avoid overriding API endpoints.
 * @route GET *
 */
expressApplication.get('*', (_httpRequest: Request, httpResponse: Response) => {
  httpResponse.sendFile(path.join(currentDirectoryPath, '../static/dist/index.html'));
  return;
});

// ============================================================================
// Server Startup
// ============================================================================

expressApplication.listen(HTTP_SERVER_PORT, '0.0.0.0', () => {
  console.log(`ARK ASA Backup Manager listening on http://0.0.0.0:${HTTP_SERVER_PORT}`);
});

// ============================================================================
// Graceful Shutdown Handlers
// ============================================================================

/**
 * Handles SIGTERM signal for graceful shutdown.
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, initiating graceful shutdown');
  isBackupLoopActive = false;
  process.exit(0);
});

/**
 * Handles SIGINT signal (Ctrl+C) for graceful shutdown.
 */
process.on('SIGINT', () => {
  console.log('SIGINT received, initiating graceful shutdown');
  isBackupLoopActive = false;
  process.exit(0);
});
