/**
 * @fileoverview Backup validation business logic.
 * Pure functions for validating backup operations and user input.
 * Contains domain rules and invariants that must be enforced.
 *
 * Clean Architecture: Service Layer
 * - Pure functions only (same input = same output)
 * - No side effects or IO operations
 * - No React, no browser APIs, no frameworks
 * - Easy to unit test in isolation
 */

import type { Backup, ValidationResult } from '../domain/backup';

/** Maximum allowed length for backup notes */
const MAX_NOTES_LENGTH = 500;

/** Maximum allowed number of tags per backup */
const MAX_TAGS_COUNT = 10;

/** Maximum allowed length for a single tag */
const MAX_TAG_LENGTH = 50;

/** Important tags that indicate high-priority backups */
const IMPORTANT_TAGS = new Set(['pre-boss', 'milestone', 'stable', 'critical', 'important']);

/**
 * Validates backup notes according to business rules.
 * Notes must not exceed maximum length and should not contain dangerous characters.
 *
 * @param {string} notes - The notes text to validate
 * @returns {ValidationResult} Validation result with error message if invalid
 *
 * @example
 * const result = validateBackupNotes('Pre-boss fight backup');
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export function validateBackupNotes(notes: string): ValidationResult {
  if (!notes || notes.trim().length === 0) {
    return { isValid: true }; // Empty notes are allowed
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return {
      isValid: false,
      error: `Notes must be ${MAX_NOTES_LENGTH} characters or less (currently ${notes.length})`,
    };
  }

  return { isValid: true };
}

/**
 * Validates backup tags according to business rules.
 * Tags must not exceed maximum count or length, and should follow naming conventions.
 *
 * @param {ReadonlyArray<string>} tags - Array of tags to validate
 * @returns {ValidationResult} Validation result with error message if invalid
 *
 * @example
 * const result = validateBackupTags(['pre-boss', 'milestone']);
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export function validateBackupTags(tags: ReadonlyArray<string>): ValidationResult {
  if (!tags || tags.length === 0) {
    return { isValid: true }; // Empty tags are allowed
  }

  if (tags.length > MAX_TAGS_COUNT) {
    return {
      isValid: false,
      error: `Maximum ${MAX_TAGS_COUNT} tags allowed (currently ${tags.length})`,
    };
  }

  for (const tag of tags) {
    if (tag.length === 0) {
      return {
        isValid: false,
        error: 'Empty tags are not allowed',
      };
    }

    if (tag.length > MAX_TAG_LENGTH) {
      return {
        isValid: false,
        error: `Tag "${tag}" exceeds maximum length of ${MAX_TAG_LENGTH} characters`,
      };
    }

    // Tags should only contain alphanumeric, hyphens, and underscores
    if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
      return {
        isValid: false,
        error: `Tag "${tag}" contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates whether a backup can be safely deleted.
 * Checks for important tags and other business rules that prevent deletion.
 *
 * @param {Backup} backup - The backup to validate for deletion
 * @returns {ValidationResult} Validation result with reason if deletion is not allowed
 *
 * @example
 * const result = canDeleteBackup(backup);
 * if (!result.isValid) {
 *   alert(result.error); // Show warning to user
 * }
 */
export function canDeleteBackup(backup: Backup): ValidationResult {
  // Check if backup has important tags that prevent deletion
  const hasImportantTag = backup.tags?.some((tag) => IMPORTANT_TAGS.has(tag.toLowerCase()));

  if (hasImportantTag) {
    return {
      isValid: false,
      error: `Cannot delete backup with important tags: ${backup.tags?.filter((tag) => IMPORTANT_TAGS.has(tag.toLowerCase())).join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates whether a backup can be restored.
 * Checks verification status and other business rules.
 *
 * @param {Backup} backup - The backup to validate for restoration
 * @param {boolean} isServerRunning - Whether the ARK server is currently running
 * @returns {ValidationResult} Validation result with reason if restoration is not allowed
 *
 * @example
 * const result = canRestoreBackup(backup, serverStatus.status === 'running');
 * if (!result.isValid) {
 *   alert(result.error); // Show warning to user
 * }
 */
export function canRestoreBackup(backup: Backup, isServerRunning: boolean): ValidationResult {
  if (isServerRunning) {
    return {
      isValid: false,
      error: 'Server must be stopped before restoring backups to prevent data corruption',
    };
  }

  if (backup.verificationStatus === 'failed') {
    return {
      isValid: false,
      error: 'Cannot restore a backup that failed verification. The backup file may be corrupted.',
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes user input for backup notes.
 * Trims whitespace and normalizes line endings.
 *
 * @param {string} notes - Raw notes input from user
 * @returns {string} Sanitized notes text
 *
 * @example
 * const sanitized = sanitizeBackupNotes('  Pre-boss fight  \n\n');
 * // Returns: 'Pre-boss fight'
 */
export function sanitizeBackupNotes(notes: string): string {
  return notes.trim().replaceAll('\r\n', '\n');
}

/**
 * Sanitizes and normalizes backup tags.
 * Trims whitespace, converts to lowercase, removes duplicates.
 *
 * @param {ReadonlyArray<string>} tags - Raw tags input from user
 * @returns {string[]} Sanitized and deduplicated tags array
 *
 * @example
 * const sanitized = sanitizeTags(['Pre-Boss', 'pre-boss', '  milestone  ']);
 * // Returns: ['pre-boss', 'milestone']
 */
export function sanitizeTags(tags: ReadonlyArray<string>): string[] {
  const normalized = tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);

  // Remove duplicates while preserving order
  return Array.from(new Set(normalized));
}
