/**
 * @fileoverview Custom hook for managing backup restore progress tracking.
 * Handles SSE stream progress updates and restore state management.
 * Reduces component state complexity by encapsulating restore progress logic.
 *
 * Design Pattern: Observer Pattern - subscribes to restore progress events
 * Clean Architecture: UI Helper (manages UI state for restore progress)
 */

import { useState, useCallback } from 'react';

/**
 * Restore progress event interface.
 * Represents a single progress update from the SSE stream.
 * @interface RestoreProgressEvent
 */
export interface RestoreProgressEvent {
  /** Current restore stage (e.g., 'extracting', 'copying') */
  stage: string;
  /** Progress percentage (0-100) */
  percent: number;
  /** Optional status message */
  message?: string;
}

/**
 * Return type for useRestoreProgress hook.
 * @interface UseRestoreProgressReturn
 */
export interface UseRestoreProgressReturn {
  /** Name of the backup currently being restored (null if no restore in progress) */
  restoringBackupName: string | null;
  /** Current restore progress percentage (0-100) */
  restoreProgress: number;
  /** Current restore status message */
  restoreMessage: string;
  /** Whether a restore operation is currently in progress */
  isRestoring: boolean;
  /** Function to start restore progress tracking */
  startRestore: (backupName: string) => void;
  /** Function to update restore progress */
  updateProgress: (event: RestoreProgressEvent) => void;
  /** Function to complete restore (clears state after delay) */
  completeRestore: () => void;
  /** Function to reset restore state immediately */
  resetRestore: () => void;
}

/** Delay in milliseconds to keep progress visible after completion */
const COMPLETION_DISPLAY_DELAY_MS = 2000;

/**
 * Custom hook for managing backup restore progress.
 * Handles restore state, progress percentage, and status messages.
 *
 * Features:
 * - Track which backup is being restored
 * - Monitor progress percentage (0-100)
 * - Display status messages from HTTP stream
 * - Auto-cleanup after completion
 * - Observable pattern for progress updates
 *
 * @returns {UseRestoreProgressReturn} Restore progress state and controls
 *
 * @example
 * ```typescript
 * const {
 *   restoringBackupName,
 *   restoreProgress,
 *   restoreMessage,
 *   isRestoring,
 *   startRestore,
 *   updateProgress,
 *   completeRestore,
 *   resetRestore
 * } = useRestoreProgress();
 *
 * // Start restore
 * startRestore('backup-2025-01-15.tar.gz');
 *
 * // Update progress from stream callback
 * await api.restoreBackup(backupName, (event) => {
 *   updateProgress(event);
 * });
 *
 * // Complete restore (auto-clears after 2s)
 * completeRestore();
 *
 * // Display progress
 * {isRestoring && (
 *   <Progress value={restoreProgress} />
 * )}
 * ```
 */
export function useRestoreProgress(): UseRestoreProgressReturn {
  const [restoringBackupName, setRestoringBackupName] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreMessage, setRestoreMessage] = useState<string>('');

  /**
   * Starts a new restore operation.
   * Initializes progress state for the specified backup.
   */
  const startRestore = useCallback((backupName: string): void => {
    setRestoringBackupName(backupName);
    setRestoreProgress(0);
    setRestoreMessage('Starting restore...');
  }, []);

  /**
   * Updates the restore progress based on SSE event.
   * Called from the progress callback in api.restoreBackup().
   */
  const updateProgress = useCallback((event: RestoreProgressEvent): void => {
    setRestoreProgress(event.percent);
    if (event.message) {
      setRestoreMessage(event.message);
    }
  }, []);

  /**
   * Completes the restore operation.
   * Keeps progress visible briefly before clearing state.
   */
  const completeRestore = useCallback((): void => {
    setTimeout(() => {
      setRestoringBackupName(null);
      setRestoreProgress(0);
      setRestoreMessage('');
    }, COMPLETION_DISPLAY_DELAY_MS);
  }, []);

  /**
   * Immediately resets all restore state.
   * Use this for cancellation or error scenarios.
   */
  const resetRestore = useCallback((): void => {
    setRestoringBackupName(null);
    setRestoreProgress(0);
    setRestoreMessage('');
  }, []);

  const isRestoring = restoringBackupName !== null;

  return {
    restoringBackupName,
    restoreProgress,
    restoreMessage,
    isRestoring,
    startRestore,
    updateProgress,
    completeRestore,
    resetRestore,
  };
}
