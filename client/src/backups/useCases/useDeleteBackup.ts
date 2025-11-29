/**
 * @fileoverview UseCase for deleting a backup.
 * Orchestrates backup deletion with validation, confirmation, and user feedback.
 *
 * Clean Architecture: UseCase Layer
 * - Validates deletion with Service layer business rules
 * - Calls Adapter for side effects
 * - Manages loading states
 * - Provides user feedback via toast
 */

import { useState, useCallback } from 'react';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import { canDeleteBackup } from '../services/backupValidationService';
import { isBackupProtected } from '../services/backupPriorityService';
import { toast } from '../../shared/services/toast';
import type { Backup } from '../domain/backup';

/**
 * Return type for useDeleteBackup hook.
 */
export interface UseDeleteBackupReturn {
  /** Name of backup currently being deleted (null if none) */
  deletingBackupName: string | null;

  /** Whether deletion is in progress */
  isDeleting: boolean;

  /** Deletes a backup with validation and feedback */
  deleteBackup: (backup: Backup, onSuccess?: () => void) => Promise<void>;

  /** Checks if a backup can be deleted (validation only, no side effects) */
  canDelete: (backup: Backup) => { allowed: boolean; reason?: string };

  /** Checks if a backup requires extra confirmation */
  requiresConfirmation: (backup: Backup) => boolean;
}

/**
 * UseCase hook for deleting backups.
 * Handles validation, API calls, and user feedback.
 *
 * Features:
 * - Business rule validation (important tags prevent deletion)
 * - Protection checks for high-priority backups
 * - Loading state tracking
 * - Success/error toast notifications
 * - Optional success callback for parent components
 *
 * @returns {UseDeleteBackupReturn} Delete operations and state
 *
 * @example
 * ```typescript
 * function BackupCard({ backup }) {
 *   const { deletingBackupName, deleteBackup, canDelete, requiresConfirmation } = useDeleteBackup();
 *
 *   const handleDelete = () => {
 *     const check = canDelete(backup);
 *     if (!check.allowed) {
 *       alert(check.reason);
 *       return;
 *     }
 *
 *     if (requiresConfirmation(backup)) {
 *       if (!confirm('This is an important backup. Delete anyway?')) return;
 *     }
 *
 *     deleteBackup(backup);
 *   };
 *
 *   return (
 *     <Button
 *       isLoading={deletingBackupName === backup.name}
 *       onPress={handleDelete}
 *     >
 *       Delete
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteBackup(): UseDeleteBackupReturn {
  const [deletingBackupName, setDeletingBackupName] = useState<string | null>(null);

  /**
   * Checks if a backup can be deleted according to business rules.
   * Pure validation function - no side effects.
   */
  const canDelete = useCallback((backup: Backup): { allowed: boolean; reason?: string } => {
    const validation = canDeleteBackup(backup);
    return {
      allowed: validation.isValid,
      reason: validation.error,
    };
  }, []);

  /**
   * Checks if a backup requires extra confirmation before deletion.
   * Protected backups (high priority) need user confirmation.
   */
  const requiresConfirmation = useCallback((backup: Backup): boolean => {
    return isBackupProtected(backup);
  }, []);

  /**
   * Deletes a backup with validation and user feedback.
   */
  const deleteBackup = useCallback(
    async (backup: Backup, onSuccess?: () => void): Promise<void> => {
      // 1. Validate using Service layer
      const validation = canDeleteBackup(backup);
      if (!validation.isValid) {
        toast.error(validation.error || 'Cannot delete this backup');
        return;
      }

      setDeletingBackupName(backup.name);

      try {
        // 2. Call Adapter to trigger side effect
        await backupApiAdapter.deleteBackup(backup.name);

        // 3. Success feedback
        toast.success(`Backup "${backup.name}" deleted successfully`);

        // 4. Call success callback (usually triggers parent refresh)
        onSuccess?.();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete backup';
        console.error('Failed to delete backup:', error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setDeletingBackupName(null);
      }
    },
    []
  );

  return {
    deletingBackupName,
    isDeleting: deletingBackupName !== null,
    deleteBackup,
    canDelete,
    requiresConfirmation,
  };
}
