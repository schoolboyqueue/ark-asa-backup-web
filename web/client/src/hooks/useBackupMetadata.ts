/**
 * @fileoverview Custom hook for managing backup metadata (notes and tags) operations.
 * Provides save/update functionality for backup metadata with loading state tracking.
 * Reduces component state complexity by encapsulating metadata operations.
 *
 * Design Pattern: Repository Pattern - abstracts metadata persistence
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toast';

/**
 * Return type for useBackupMetadata hook.
 * @interface UseBackupMetadataReturn
 */
export interface UseBackupMetadataReturn {
  /** Whether metadata is currently being saved */
  isSavingMetadata: boolean;
  /** Function to save backup metadata (notes and tags) */
  saveMetadata: (backupName: string, notes: string, tags: string[]) => Promise<void>;
}

/**
 * Custom hook for managing backup metadata operations.
 * Handles saving notes and tags to backup metadata files.
 *
 * Features:
 * - Save notes and tags together
 * - Loading state during save operation
 * - Toast notifications for success/error
 * - Error handling with detailed messages
 *
 * Note: This hook will be used with the new updateBackupMetadata API
 * that accepts both notes and tags. Once backend is updated, this hook
 * will replace the old updateBackupNotes calls.
 *
 * @returns {UseBackupMetadataReturn} Metadata save method and loading state
 *
 * @example
 * ```typescript
 * const { saveMetadata, isSavingMetadata } = useBackupMetadata();
 *
 * // Save metadata from drawer
 * const handleSaveMetadata = async (
 *   backupName: string,
 *   notes: string,
 *   tags: string[]
 * ) => {
 *   await saveMetadata(backupName, notes, tags);
 * };
 *
 * // Show loading state
 * <Button isLoading={isSavingMetadata} onPress={handleSaveMetadata}>
 *   Save
 * </Button>
 * ```
 */
export function useBackupMetadata(): UseBackupMetadataReturn {
  const [isSavingMetadata, setIsSavingMetadata] = useState<boolean>(false);

  /**
   * Saves backup metadata (notes and tags) to the backend.
   * Creates or updates the .meta.json file for the backup.
   *
   * @param {string} backupName - Name of the backup to update
   * @param {string} notes - User-provided notes for the backup
   * @param {string[]} tags - Array of tags for categorizing the backup
   * @returns {Promise<void>} Resolves when save completes
   * @throws {Error} When save operation fails
   */
  const saveMetadata = useCallback(
    async (backupName: string, notes: string, tags: string[]): Promise<void> => {
      setIsSavingMetadata(true);
      try {
        await api.updateBackupMetadata(backupName, notes, tags);
        toast.success('Backup metadata updated');
      } catch (error) {
        console.error('Failed to update metadata:', error);
        toast.error(
          `Failed to update metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        throw error;
      } finally {
        setIsSavingMetadata(false);
      }
    },
    []
  );

  return {
    isSavingMetadata,
    saveMetadata,
  };
}
