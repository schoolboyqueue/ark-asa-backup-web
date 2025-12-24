/**
 * @fileoverview UseCase for updating backup metadata (notes and tags).
 * Orchestrates metadata updates with validation and user feedback.
 *
 * Clean Architecture: UseCase Layer
 * - Validates input with Service layer
 * - Calls Adapter for side effects
 * - Manages loading state
 * - Provides user feedback
 */

import { useCallback, useState } from 'react';
import { toast } from '../../shared/services/toast';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import type { Backup, UpdateBackupMetadataDto } from '../domain/backup';
import {
  sanitizeBackupNotes,
  sanitizeTags,
  validateBackupNotes,
  validateBackupTags,
} from '../services/backupValidationService';

/**
 * Return type for useUpdateBackupMetadata hook.
 */
export interface UseUpdateBackupMetadataReturn {
  /** Whether metadata update is in progress */
  isSaving: boolean;

  /** Error message if validation or save failed */
  error: string | null;

  /** Updates backup metadata (notes and tags) */
  updateMetadata: (backup: Backup, notes: string, tags: string[]) => Promise<void>;
}

/**
 * UseCase hook for updating backup metadata.
 * Handles validation, sanitization, API calls, and user feedback.
 *
 * @returns {UseUpdateBackupMetadataReturn} Update operation and state
 *
 * @example
 * ```typescript
 * function BackupMetadataForm({ backup }) {
 *   const { isSaving, error, updateMetadata } = useUpdateBackupMetadata();
 *   const [notes, setNotes] = useState(backup.notes || '');
 *   const [tags, setTags] = useState(backup.tags || []);
 *
 *   const handleSave = async () => {
 *     await updateMetadata(backup, notes, tags);
 *   };
 *
 *   return (
 *     <form>
 *       <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
 *       <TagInput value={tags} onChange={setTags} />
 *       <Button isLoading={isSaving} onPress={handleSave}>
 *         Save
 *       </Button>
 *       {error && <Alert>{error}</Alert>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateBackupMetadata(): UseUpdateBackupMetadataReturn {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Updates backup metadata with validation.
   */
  const updateMetadata = useCallback(
    async (backup: Backup, notes: string, tags: string[]): Promise<void> => {
      setIsSaving(true);
      setError(null);

      try {
        // 1. Sanitize input
        const sanitizedNotes = sanitizeBackupNotes(notes);
        const sanitizedTags = sanitizeTags(tags);

        // 2. Validate using Service layer
        const notesValidation = validateBackupNotes(sanitizedNotes);
        if (!notesValidation.isValid) {
          setError(notesValidation.error || 'Invalid notes');
          setIsSaving(false);
          return;
        }

        const tagsValidation = validateBackupTags(sanitizedTags);
        if (!tagsValidation.isValid) {
          setError(tagsValidation.error || 'Invalid tags');
          setIsSaving(false);
          return;
        }

        // 3. Create DTO for API call
        const dto: UpdateBackupMetadataDto = {
          backupName: backup.name,
          notes: sanitizedNotes,
          tags: sanitizedTags,
        };

        // 4. Call Adapter to trigger side effect
        await backupApiAdapter.updateBackupMetadata(dto);

        // 5. Success feedback
        toast.success('Metadata updated successfully!');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update metadata';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    isSaving,
    error,
    updateMetadata,
  };
}
