/**
 * @fileoverview UseCase for miscellaneous backup actions.
 * Handles download, verify, and clipboard operations.
 *
 * Clean Architecture: UseCase Layer
 * - Orchestrates non-CRUD backup operations
 * - Calls Adapter for side effects
 * - Manages loading states
 * - Provides user feedback
 */

import { useState, useCallback } from 'react';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import { toast } from '../../shared/services/toast';
import type { Backup } from '../domain/backup';

/** Delay for clipboard success indicator */
const CLIPBOARD_INDICATOR_DELAY_MS = 2000;

/** Delay for verify loading state */
const VERIFY_LOADING_DELAY_MS = 1000;

/**
 * Return type for useBackupActions hook.
 */
export interface UseBackupActionsReturn {
  /** Name of backup currently being downloaded */
  downloadingBackupName: string | null;

  /** Name of backup currently being verified */
  verifyingBackupName: string | null;

  /** Name of backup whose name was recently copied */
  copiedBackupName: string | null;

  /** Downloads a backup to user's device */
  downloadBackup: (backup: Backup) => Promise<void>;

  /** Verifies backup integrity */
  verifyBackup: (backup: Backup) => Promise<void>;

  /** Copies backup name to clipboard */
  copyBackupName: (backup: Backup) => Promise<void>;
}

/**
 * UseCase hook for backup actions (download, verify, copy).
 * Manages loading states and user feedback for each operation.
 *
 * @returns {UseBackupActionsReturn} Action methods and loading states
 *
 * @example
 * ```typescript
 * function BackupCard({ backup }) {
 *   const {
 *     downloadingBackupName,
 *     verifyingBackupName,
 *     copiedBackupName,
 *     downloadBackup,
 *     verifyBackup,
 *     copyBackupName,
 *   } = useBackupActions();
 *
 *   return (
 *     <>
 *       <Button
 *         isLoading={downloadingBackupName === backup.name}
 *         onPress={() => downloadBackup(backup)}
 *       >
 *         Download
 *       </Button>
 *       <Button
 *         isLoading={verifyingBackupName === backup.name}
 *         onPress={() => verifyBackup(backup)}
 *       >
 *         Verify
 *       </Button>
 *       <Button onPress={() => copyBackupName(backup)}>
 *         {copiedBackupName === backup.name ? 'Copied!' : 'Copy Name'}
 *       </Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useBackupActions(): UseBackupActionsReturn {
  const [downloadingBackupName, setDownloadingBackupName] = useState<string | null>(null);
  const [verifyingBackupName, setVerifyingBackupName] = useState<string | null>(null);
  const [copiedBackupName, setCopiedBackupName] = useState<string | null>(null);

  /**
   * Downloads a backup archive to user's device.
   */
  const downloadBackup = useCallback(async (backup: Backup): Promise<void> => {
    setDownloadingBackupName(backup.name);

    try {
      // Call Adapter to trigger download
      await backupApiAdapter.downloadBackup(backup.name);

      // Success feedback
      toast.success(`Downloading "${backup.name}"...`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download backup';
      console.error('Failed to download backup:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      // Keep loading state briefly for visual feedback
      setTimeout(() => {
        setDownloadingBackupName(null);
      }, 500);
    }
  }, []);

  /**
   * Verifies backup integrity by testing archive extraction.
   */
  const verifyBackup = useCallback(async (backup: Backup): Promise<void> => {
    setVerifyingBackupName(backup.name);

    try {
      // Call Adapter to verify
      const result = await backupApiAdapter.verifyBackup(backup.name);

      // Success feedback with file count
      if (result.status === 'verified') {
        toast.success(`Backup verified! ${result.fileCount} files found.`);
      } else if (result.status === 'failed') {
        toast.error(`Verification failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify backup';
      console.error('Failed to verify backup:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      // Keep loading state briefly to show action was registered
      setTimeout(() => {
        setVerifyingBackupName(null);
      }, VERIFY_LOADING_DELAY_MS);
    }
  }, []);

  /**
   * Copies backup name to clipboard with visual feedback.
   */
  const copyBackupName = useCallback(async (backup: Backup): Promise<void> => {
    try {
      // Call Adapter to copy to clipboard
      await backupApiAdapter.copyToClipboard(backup.name);

      // Success feedback
      setCopiedBackupName(backup.name);
      toast.success('Backup name copied to clipboard');

      // Clear indicator after delay
      setTimeout(() => {
        setCopiedBackupName(null);
      }, CLIPBOARD_INDICATOR_DELAY_MS);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
      throw error;
    }
  }, []);

  return {
    downloadingBackupName,
    verifyingBackupName,
    copiedBackupName,
    downloadBackup,
    verifyBackup,
    copyBackupName,
  };
}
