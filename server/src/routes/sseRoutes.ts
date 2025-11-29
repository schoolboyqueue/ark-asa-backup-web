/**
 * @fileoverview Server-Sent Events (SSE) routes for ARK ASA Backup Manager.
 * Provides real-time streaming updates for server status, backups, health, disk space, and restore progress.
 */

import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import tar from 'tar';
import { listAvailableBackups, createPreRestoreSafetyBackup } from '../services/backupService.js';
import { retrieveDiskSpaceInfo, getBackupHealthStatus } from '../services/systemService.js';
import {
  isSchedulerActive,
  getLastSuccessfulBackupTime,
  getLastFailedBackupTime,
  getLastBackupError,
} from '../services/schedulerService.js';
import { getContainerStatus } from '../services/dockerService.js';
import { getEffectiveServerStatus } from '../services/serverStateService.js';
import { loadBackupSettings } from '../services/settingsService.js';
import { initializeSSEStream, setupSSECleanup } from '../utils/sseStream.js';
import {
  BACKUP_STORAGE_DIRECTORY,
  ARK_SAVE_DIRECTORY,
  ARK_SERVER_CONTAINER_NAME,
} from '../config/constants.js';

const sseRouter = Router();

// ============================================================================
// Server Status SSE Stream
// ============================================================================

/**
 * Server-Sent Events stream for real-time server status updates.
 * Polls Docker API every 500ms and sends updates when status changes.
 * Includes transitional states (starting/stopping) for better UX.
 * @route GET /api/server/status/stream
 */
sseRouter.get(
  '/api/server/status/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    const sendEvent = initializeSSEStream(httpResponse);

    let previousStatus: string | null = null;
    let isStreamActive = true;

    // Send initial heartbeat
    sendEvent('connected', { message: 'Status stream connected' });

    /**
     * Polls server status and sends updates when changes occur.
     * Uses faster polling (500ms) to catch transitional states.
     */
    const pollServerStatus = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const dockerStatus = await getContainerStatus();

          if (!dockerStatus) {
            sendEvent('error', {
              ok: false,
              error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
            });
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
            continue;
          }

          // Get effective status (includes transitional states like 'starting'/'stopping')
          const effectiveStatus = getEffectiveServerStatus(dockerStatus);

          if (effectiveStatus !== previousStatus) {
            sendEvent('status', { ok: true, status: effectiveStatus });
            previousStatus = effectiveStatus;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
        } catch (statusError) {
          sendEvent('error', { ok: false, error: String(statusError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
        }
      }
    };

    setupSSECleanup(httpResponse, () => {
      isStreamActive = false;
      console.log('Server status stream client disconnected');
    });

    pollServerStatus();
  }
);

// ============================================================================
// Backups List SSE Stream
// ============================================================================

/**
 * Server-Sent Events stream for real-time backups list updates.
 * Polls filesystem every 3 seconds and sends updates when backups change.
 * @route GET /api/backups/stream
 */
sseRouter.get('/api/backups/stream', async (_httpRequest: Request, httpResponse: Response) => {
  const sendEvent = initializeSSEStream(httpResponse);

  let previousBackupsList: string | null = null;
  let isStreamActive = true;

  sendEvent('connected', { message: 'Backups stream connected' });

  const pollBackupsList = async (): Promise<void> => {
    while (isStreamActive) {
      try {
        const backupFiles = await listAvailableBackups();
        const backupsListJson = JSON.stringify(backupFiles);

        if (backupsListJson !== previousBackupsList) {
          sendEvent('backups', backupFiles);
          previousBackupsList = backupsListJson;
        }

        await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
      } catch (backupsError) {
        sendEvent('error', { error: String(backupsError) });
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000));
      }
    }
  };

  setupSSECleanup(httpResponse, () => {
    isStreamActive = false;
    console.log('Backups stream client disconnected');
  });

  pollBackupsList();
});

// ============================================================================
// Backup Health SSE Stream
// ============================================================================

/**
 * Server-Sent Events stream for real-time backup health status updates.
 * Sends updates every 5 seconds with scheduler status and last backup info.
 * @route GET /api/backup/health/stream
 */
sseRouter.get(
  '/api/backup/health/stream',
  async (_httpRequest: Request, httpResponse: Response) => {
    const sendEvent = initializeSSEStream(httpResponse);

    let previousHealthJson: string | null = null;
    let isStreamActive = true;

    sendEvent('connected', { message: 'Backup health stream connected' });

    const pollBackupHealth = async (): Promise<void> => {
      while (isStreamActive) {
        try {
          const healthStatus = getBackupHealthStatus(
            isSchedulerActive(),
            getLastSuccessfulBackupTime(),
            getLastFailedBackupTime(),
            getLastBackupError()
          );
          const healthJson = JSON.stringify(healthStatus);

          if (healthJson !== previousHealthJson) {
            sendEvent('health', healthStatus);
            previousHealthJson = healthJson;
          }

          await new Promise((resolvePromise) => setTimeout(resolvePromise, 5000));
        } catch (healthError) {
          sendEvent('error', { ok: false, error: String(healthError) });
          await new Promise((resolvePromise) => setTimeout(resolvePromise, 5000));
        }
      }
    };

    setupSSECleanup(httpResponse, () => {
      isStreamActive = false;
      console.log('Backup health stream client disconnected');
    });

    pollBackupHealth();
  }
);

// ============================================================================
// Disk Space SSE Stream
// ============================================================================

/**
 * Server-Sent Events stream for real-time disk space updates.
 * Polls filesystem every 10 seconds and sends updates when disk usage changes.
 * @route GET /api/disk-space/stream
 */
sseRouter.get('/api/disk-space/stream', async (_httpRequest: Request, httpResponse: Response) => {
  const sendEvent = initializeSSEStream(httpResponse);

  let previousDiskSpaceJson: string | null = null;
  let isStreamActive = true;

  sendEvent('connected', { message: 'Disk space stream connected' });

  const pollDiskSpace = async (): Promise<void> => {
    while (isStreamActive) {
      try {
        const diskSpaceInfo = await retrieveDiskSpaceInfo();
        const diskSpaceJson = JSON.stringify(diskSpaceInfo);

        if (diskSpaceJson !== previousDiskSpaceJson) {
          sendEvent('diskspace', diskSpaceInfo);
          previousDiskSpaceJson = diskSpaceJson;
        }

        await new Promise((resolvePromise) => setTimeout(resolvePromise, 10000));
      } catch (diskSpaceError) {
        sendEvent('error', { ok: false, error: String(diskSpaceError) });
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 10000));
      }
    }
  };

  setupSSECleanup(httpResponse, () => {
    isStreamActive = false;
    console.log('Disk space stream client disconnected');
  });

  pollDiskSpace();
});

// ============================================================================
// Disk Space Single Request (Not SSE)
// ============================================================================

/**
 * Retrieves disk space information for the backup storage directory.
 * Returns total, used, and available disk space in bytes.
 * @route GET /api/disk-space
 */
sseRouter.get('/api/disk-space', async (_httpRequest: Request, httpResponse: Response) => {
  try {
    const diskSpaceInfo = await retrieveDiskSpaceInfo();
    httpResponse.json(diskSpaceInfo);
  } catch (diskSpaceError) {
    console.error('Failed to retrieve disk space:', diskSpaceError);
    httpResponse
      .status(500)
      .json({ ok: false, error: `disk space retrieval failed: ${diskSpaceError}` });
  }
});

// ============================================================================
// Unified SSE Stream (single connection for multiple event types)
// ============================================================================

/**
 * Unified SSE stream that emits server status, backups, health, and disk space updates.
 * @route GET /api/stream
 */
sseRouter.get('/api/stream', async (_httpRequest: Request, httpResponse: Response) => {
  const sendEvent = initializeSSEStream(httpResponse);
  sendEvent('connected', { message: 'Unified stream connected' });

  let isActive = true;
  const timers: NodeJS.Timeout[] = [];

  const cleanup = (): void => {
    isActive = false;
    timers.forEach(clearInterval);
    console.log('Unified stream client disconnected');
  };

  setupSSECleanup(httpResponse, cleanup);

  const startPolling = (fn: () => void, intervalMs: number): void => {
    fn();
    const timer = setInterval(() => {
      if (!isActive) {
        clearInterval(timer);
        return;
      }
      fn();
    }, intervalMs);
    timers.push(timer);
  };

  let previousStatus: string | null = null;
  startPolling(async () => {
    try {
      const dockerStatus = await getContainerStatus();
      if (!dockerStatus) {
        sendEvent('server-status-error', {
          ok: false,
          error: `container '${ARK_SERVER_CONTAINER_NAME}' not found`,
        });
        return;
      }
      // Get effective status (includes transitional states like 'starting'/'stopping')
      const effectiveStatus = getEffectiveServerStatus(dockerStatus);
      if (effectiveStatus !== previousStatus) {
        sendEvent('server-status', { ok: true, status: effectiveStatus });
        previousStatus = effectiveStatus;
      }
    } catch (statusError) {
      sendEvent('server-status-error', { ok: false, error: String(statusError) });
    }
  }, 500); // Fast polling for transitional states

  let previousBackupsJson: string | null = null;
  startPolling(async () => {
    try {
      const backupFiles = await listAvailableBackups();
      const backupsJson = JSON.stringify(backupFiles);
      if (backupsJson !== previousBackupsJson) {
        sendEvent('backups', backupFiles);
        previousBackupsJson = backupsJson;
      }
    } catch (backupsError) {
      sendEvent('backups-error', { ok: false, error: String(backupsError) });
    }
  }, 3000);

  let previousHealthJson: string | null = null;
  startPolling(async () => {
    try {
      const healthStatus = getBackupHealthStatus(
        isSchedulerActive(),
        getLastSuccessfulBackupTime(),
        getLastFailedBackupTime(),
        getLastBackupError()
      );
      const healthJson = JSON.stringify(healthStatus);
      if (healthJson !== previousHealthJson) {
        sendEvent('backup-health', healthStatus);
        previousHealthJson = healthJson;
      }
    } catch (healthError) {
      sendEvent('backup-health-error', { ok: false, error: String(healthError) });
    }
  }, 5000);

  let previousDiskJson: string | null = null;
  startPolling(async () => {
    try {
      const diskSpaceInfo = await retrieveDiskSpaceInfo();
      const diskJson = JSON.stringify(diskSpaceInfo);
      if (diskJson !== previousDiskJson) {
        sendEvent('disk-space', diskSpaceInfo);
        previousDiskJson = diskJson;
      }
    } catch (diskSpaceError) {
      sendEvent('disk-space-error', { ok: false, error: String(diskSpaceError) });
    }
  }, 10000);
});

// ============================================================================
// Restore Operation with SSE Progress
// ============================================================================

/**
 * Restores a backup archive to the ARK save directory with Server-Sent Events progress.
 * Optionally creates a pre-restore safety backup based on AUTO_SAFETY_BACKUP setting.
 * WARNING: Deletes all current save files after optional safety backup, then extracts restore archive.
 * @route POST /api/restore
 */
sseRouter.post('/api/restore', async (httpRequest: Request, httpResponse: Response) => {
  const { backup_name: backupNameToRestore } = httpRequest.body;

  if (!backupNameToRestore) {
    httpResponse.status(400).json({ ok: false, error: 'backup_name is required' });
    return;
  }

  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupNameToRestore);
  const sendEvent = initializeSSEStream(httpResponse);

  try {
    await fs.access(backupFilePath);

    sendEvent('progress', { stage: 'starting', percent: 0 });

    // Load current settings to check auto safety backup preference
    const currentSettings = await loadBackupSettings();
    const shouldCreateSafetyBackup = currentSettings.AUTO_SAFETY_BACKUP !== false;

    let safetyBackupName: string | null = null;

    // Create safety backup if enabled
    if (shouldCreateSafetyBackup) {
      sendEvent('progress', {
        stage: 'safety_backup',
        percent: 5,
        message: 'Creating pre-restore safety backup...',
      });

      try {
        safetyBackupName = await createPreRestoreSafetyBackup();
        sendEvent('progress', {
          stage: 'safety_backup',
          percent: 15,
          message: `Safety backup created: ${safetyBackupName}`,
        });
      } catch (safetyBackupError) {
        sendEvent('error', {
          ok: false,
          error: `Failed to create safety backup: ${safetyBackupError instanceof Error ? safetyBackupError.message : String(safetyBackupError)}`,
        });
        httpResponse.end();
        return;
      }
    } else {
      sendEvent('progress', {
        stage: 'skipping_safety_backup',
        percent: 15,
        message: 'Skipping safety backup (disabled in settings)',
      });
    }

    // Clear all current save files
    const existingSaveFiles = await fs.readdir(ARK_SAVE_DIRECTORY);
    const totalFilesToDelete = existingSaveFiles.length;

    sendEvent('progress', {
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
      sendEvent('progress', {
        stage: 'deleting',
        percent: Math.round(deletionProgress),
        message: `Deleted ${fileIndex + 1}/${totalFilesToDelete} files`,
      });
    }

    sendEvent('progress', {
      stage: 'extracting',
      percent: 50,
      message: 'Extracting backup archive...',
    });

    // Extract backup archive
    await tar.extract({
      file: backupFilePath,
      cwd: ARK_SAVE_DIRECTORY,
    });

    sendEvent('progress', { stage: 'complete', percent: 100, message: 'Restore complete!' });
    sendEvent('done', { ok: true, safety_backup: safetyBackupName });

    httpResponse.end();
  } catch (restoreError) {
    if ((restoreError as NodeJS.ErrnoException).code === 'ENOENT') {
      sendEvent('error', { ok: false, error: 'backup not found' });
    } else {
      sendEvent('error', { ok: false, error: `restore failed: ${restoreError}` });
    }
    httpResponse.end();
  }
});

export default sseRouter;
