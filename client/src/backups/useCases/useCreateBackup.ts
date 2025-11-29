/**
 * @fileoverview UseCase for creating a new backup.
 * Orchestrates backup creation flow with validation, API calls, and user feedback.
 *
 * Clean Architecture: UseCase Layer
 * - Orchestrates interaction between Repository, Service, and Adapter
 * - Calls Service for business rules
 * - Calls Adapter for side effects
 * - Updates state via Repository
 * - Handles user feedback (toast notifications)
 * - Manages loading states and errors
 */

import { useState, useCallback } from 'react';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import {
  validateBackupNotes,
  validateBackupTags,
  sanitizeBackupNotes,
  sanitizeTags,
} from '../services/backupValidationService';
import { suggestBackupTags } from '../services/backupPriorityService';
import { toast } from '../../shared/services/toast';
import type { CreateBackupDto } from '../domain/backup';

/**
 * Return type for useCreateBackup hook.
 */
export interface UseCreateBackupReturn {
  /** Current form state */
  formState: {
    notes: string;
    tags: string[];
  };

  /** Whether backup creation is in progress */
  isCreating: boolean;

  /** Error message if validation or creation failed */
  error: string | null;

  /** Suggested tags based on notes content */
  suggestedTags: string[];

  /** Actions for interacting with the form */
  actions: {
    /** Update notes field */
    setNotes: (notes: string) => void;

    /** Update tags field */
    setTags: (tags: string[]) => void;

    /** Add a tag to the list */
    addTag: (tag: string) => void;

    /** Remove a tag from the list */
    removeTag: (tag: string) => void;

    /** Reset form to initial state */
    resetForm: () => void;

    /** Submit the form to create backup */
    handleSubmit: () => Promise<void>;
  };
}

/**
 * UseCase hook for creating a new manual backup.
 * Handles validation, API calls, state updates, and user feedback.
 *
 * Flow:
 * 1. User fills form (notes, tags)
 * 2. Validation runs on submit
 * 3. API call creates backup
 * 4. Success feedback shown
 * 5. Form reset
 *
 * @returns {UseCreateBackupReturn} Form state and actions
 *
 * @example
 * ```typescript
 * function CreateBackupModal() {
 *   const { formState, isCreating, error, actions } = useCreateBackup();
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); actions.handleSubmit(); }}>
 *       <Input value={formState.notes} onChange={(e) => actions.setNotes(e.target.value)} />
 *       <Button isLoading={isCreating}>Create Backup</Button>
 *       {error && <Alert>{error}</Alert>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateBackup(): UseCreateBackupReturn {
  const [notes, setNotesState] = useState<string>('');
  const [tags, setTagsState] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  /**
   * Updates notes and generates tag suggestions.
   */
  const setNotes = useCallback((newNotes: string) => {
    setNotesState(newNotes);
    setError(null);

    // Generate tag suggestions based on notes content
    if (newNotes.trim()) {
      const suggestions = suggestBackupTags(newNotes);
      setSuggestedTags(suggestions);
    } else {
      setSuggestedTags([]);
    }
  }, []);

  /**
   * Updates tags array.
   */
  const setTags = useCallback((newTags: string[]) => {
    setTagsState(newTags);
    setError(null);
  }, []);

  /**
   * Adds a tag to the list if not already present.
   */
  const addTag = useCallback(
    (tag: string) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized && !tags.includes(normalized)) {
        setTagsState((current) => [...current, normalized]);
        setError(null);
      }
    },
    [tags]
  );

  /**
   * Removes a tag from the list.
   */
  const removeTag = useCallback((tag: string) => {
    setTagsState((current) => current.filter((t) => t !== tag));
    setError(null);
  }, []);

  /**
   * Resets form to initial empty state.
   */
  const resetForm = useCallback(() => {
    setNotesState('');
    setTagsState([]);
    setError(null);
    setSuggestedTags([]);
  }, []);

  /**
   * Handles form submission with validation and API call.
   */
  const handleSubmit = useCallback(async () => {
    console.log('[useCreateBackup] handleSubmit START', { notes, tags });
    setIsCreating(true);
    setError(null);

    try {
      // 1. Sanitize input
      const sanitizedNotes = sanitizeBackupNotes(notes);
      const sanitizedTags = sanitizeTags(tags);
      console.log('[useCreateBackup] Sanitized', { sanitizedNotes, sanitizedTags });

      // 2. Validate using Service layer
      const notesValidation = validateBackupNotes(sanitizedNotes);
      console.log('[useCreateBackup] Notes validation', notesValidation);
      if (!notesValidation.isValid) {
        setError(notesValidation.error || 'Invalid notes');
        setIsCreating(false);
        return;
      }

      const tagsValidation = validateBackupTags(sanitizedTags);
      console.log('[useCreateBackup] Tags validation', tagsValidation);
      if (!tagsValidation.isValid) {
        setError(tagsValidation.error || 'Invalid tags');
        setIsCreating(false);
        return;
      }

      // 3. Create DTO for API call
      const dto: CreateBackupDto = {
        notes: sanitizedNotes || undefined,
        tags: sanitizedTags.length > 0 ? sanitizedTags : undefined,
      };
      console.log('[useCreateBackup] DTO created', dto);

      // 4. Call Adapter to trigger side effect
      console.log('[useCreateBackup] Calling API adapter...');
      await backupApiAdapter.createBackup(dto);
      console.log('[useCreateBackup] API call SUCCESS');

      // 5. Success feedback
      toast.success('Backup created successfully!');

      // 6. Reset form
      resetForm();
    } catch (err) {
      console.error('[useCreateBackup] ERROR caught:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      console.log('[useCreateBackup] handleSubmit END');
      setIsCreating(false);
    }
  }, [notes, tags, resetForm]);

  return {
    formState: {
      notes,
      tags,
    },
    isCreating,
    error,
    suggestedTags,
    actions: {
      setNotes,
      setTags,
      addTag,
      removeTag,
      resetForm,
      handleSubmit,
    },
  };
}
