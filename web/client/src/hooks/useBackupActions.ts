/**
 * @fileoverview Custom hook for managing backup CRUD operations and loading states.
 * Provides centralized backup actions (create, delete, download, verify, copy) with state tracking.
 * Reduces component state complexity by encapsulating action logic and loading states.
 *
 * Design Pattern: Command Pattern - encapsulates backup operations as methods
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toast';

/**
 * Return type for useBackupActions hook.
 * @interface UseBackupActionsReturn
 */
export interface UseBackupActionsReturn {
  /** Name of backup currently being deleted (null if none) */
  deletingBackupName: string | null;
  /** Name of backup currently being downloaded (null if none) */
  downloadingBackupName: string | null;
  /** Name of backup currently being verified (null if none) */
  verifyingBackupName: string | null;
  /** Whether a backup is currently being created */
  isCreatingBackup: boolean;
  /** Name of backup that was recently copied to clipboard (null if none) */
  copiedBackupName: string | null;
  /** Function to delete a backup */
  deleteBackup: (backupName: string, onSuccess?: () => void) => Promise<void>;
  /** Function to download a backup */
  downloadBackup: (backupName: string) => Promise<void>;
  /** Function to verify a backup's integrity */
  verifyBackup: (backupName: string) => Promise<void>;
  /** Function to create a new backup with optional notes */
  createBackup: (notes?: string) => Promise<void>;
  /** Function to copy backup name to clipboard */
  copyBackupName: (backupName: string) => Promise<void>;
}

/** Delay in milliseconds for clipboard copied indicator */
const CLIPBOARD_COPIED_DISPLAY_DELAY_MS = 2000;

/** Delay in milliseconds for verify action loading state */
const VERIFY_LOADING_STATE_DELAY_MS = 1000;

/**
 * Custom hook for managing backup operations.
 * Handles create, delete, download, verify, and copy actions with loading states.
 *
 * Features:
 * - Per-action loading states
 * - Toast notifications for success/error
 * - Clipboard copy with visual feedback
 * - Automatic cleanup of loading states
 * - Error handling for all operations
 *
 * @returns {UseBackupActionsReturn} Backup action methods and loading states
 *
 * @example
 * ```typescript
 * const {
 *   deletingBackupName,
 *   downloadingBackupName,
 *   verifyingBackupName,
 *   deleteBackup,
 *   downloadBackup,
 *   verifyBackup,
 *   createBackup,
 *   copyBackupName,
 *   copiedBackupName
 * } = useBackupActions();
 *
 * // Delete backup
 * await deleteBackup('backup-2025-01-15.tar.gz', () => {
 *   console.log('Backup deleted successfully');
 * });
 *
 * // Download backup
 * await downloadBackup('backup-2025-01-15.tar.gz');
 *
 * // Show loading state
 * <Button isLoading={deletingBackupName === backup.name}>Delete</Button>
 * ```
 */
export function useBackupActions(): UseBackupActionsReturn {
  const [deletingBackupName, setDeletingBackupName] = useState<string | null>(null);
  const [downloadingBackupName, setDownloadingBackupName] = useState<string | null>(null);
  const [verifyingBackupName, setVerifyingBackupName] = useState<string | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [copiedBackupName, setCopiedBackupName] = useState<string | null>(null);

  /**
   * Deletes a backup archive.
   * Shows loading state during operation and calls success callback when complete.
   */
  const deleteBackup = useCallback(
    async (backupName: string, onSuccess?: () => void): Promise<void> => {
      setDeletingBackupName(backupName);
      try {
        await api.deleteBackup(backupName);
        toast.success(`Backup "${backupName}" deleted successfully`);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to delete backup:', error);
        toast.error(
          `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      } finally {
        setDeletingBackupName(null);
      }
    },
    []
  );

  /**
   * Downloads a backup archive to the user's device.
   * Shows loading state during download operation.
   */
  const downloadBackup = useCallback(async (backupName: string): Promise<void> => {
    setDownloadingBackupName(backupName);
    try {
      await api.downloadBackup(backupName);
      toast.success(`Downloading "${backupName}"...`);
    } catch (error) {
      console.error('Failed to download backup:', error);
      toast.error(
        `Failed to download backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    } finally {
      // Keep loading state briefly to provide visual feedback
      setTimeout(() => {
        setDownloadingBackupName(null);
      }, 500);
    }
  }, []);

  /**
   * Verifies the integrity of a backup archive.
   * Extracts and counts files to ensure backup is not corrupted.
   */
  const verifyBackup = useCallback(async (backupName: string): Promise<void> => {
    setVerifyingBackupName(backupName);
    try {
      const verificationResult = await api.verifyBackup(backupName);

      if (verificationResult.status === 'verified') {
        toast.success(`Backup verified! ${verificationResult.file_count} files found.`);
      } else if (verificationResult.status === 'failed') {
        toast.error(
          `Verification failed: ${verificationResult.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Failed to verify backup:', error);
      toast.error(
        `Failed to verify backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    } finally {
      // Keep loading state briefly to show user the action was registered
      setTimeout(() => {
        setVerifyingBackupName(null);
      }, VERIFY_LOADING_STATE_DELAY_MS);
    }
  }, []);

  /**
   * Creates a new manual backup with optional notes.
   * Triggers an immediate backup outside the automatic schedule.
   */
  const createBackup = useCallback(async (notes?: string): Promise<void> => {
    setIsCreatingBackup(true);
    try {
      const trimmedNotes = notes?.trim();
      const response = await api.triggerBackup(trimmedNotes || undefined);
      console.log('Manual backup created successfully:', response);
      toast.success('Backup created successfully!');
    } catch (error) {
      console.error('Failed to create manual backup:', error);
      toast.error(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    } finally {
      setIsCreatingBackup(false);
    }
  }, []);

  /**
   * Copies backup name to clipboard with visual feedback.
   * Shows temporary indicator for successful copy.
   */
  const copyBackupName = useCallback(async (backupName: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(backupName);
      setCopiedBackupName(backupName);
      toast.success('Backup name copied to clipboard');

      // Clear copied state after delay
      setTimeout(() => {
        setCopiedBackupName(null);
      }, CLIPBOARD_COPIED_DISPLAY_DELAY_MS);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
      throw error;
    }
  }, []);

  return {
    deletingBackupName,
    downloadingBackupName,
    verifyingBackupName,
    isCreatingBackup,
    copiedBackupName,
    deleteBackup,
    downloadBackup,
    verifyBackup,
    createBackup,
    copyBackupName,
  };
}
