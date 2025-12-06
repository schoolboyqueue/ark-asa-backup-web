/**
 * @fileoverview Backup priority and retention business logic.
 * Pure functions for calculating backup importance and cleanup decisions.
 * Implements domain rules for backup retention policy.
 *
 * Clean Architecture: Service Layer
 * - Pure functions only (deterministic, no side effects)
 * - No framework dependencies
 * - Encapsulates backup retention domain knowledge
 */

import type { Backup } from '../domain/backup';
import { BackupPriority } from '../domain/backup';

/** Age threshold in days for "recent" backups */
const RECENT_BACKUP_DAYS = 7;

/** Age threshold in days for "old" backups */
const OLD_BACKUP_DAYS = 30;

/** Important tags that elevate backup priority */
const CRITICAL_TAGS = new Set(['critical', 'important', 'milestone']);
const HIGH_PRIORITY_TAGS = new Set(['pre-boss', 'stable', 'production']);

/** Milliseconds per day for date calculations */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates the retention priority for a backup.
 * Higher priority backups are preserved longer during cleanup.
 *
 * Priority Rules:
 * - Critical tags (critical, important, milestone) = CRITICAL (100)
 * - High priority tags (pre-boss, stable, production) = HIGH (75)
 * - Recent backups (< 7 days) = RECENT (50)
 * - Normal backups = NORMAL (25)
 * - Old backups (> 30 days) = LOW (10)
 *
 * @param {Backup} backup - The backup to evaluate
 * @returns {BackupPriority} Calculated priority level
 *
 * @example
 * const priority = calculateBackupPriority(backup);
 * if (priority === BackupPriority.CRITICAL) {
 *   console.log('This backup should never be auto-deleted');
 * }
 */
export function calculateBackupPriority(backup: Backup): BackupPriority {
  // Check for critical tags first
  const hasCriticalTag = backup.tags?.some((tag) => CRITICAL_TAGS.has(tag.toLowerCase()));
  if (hasCriticalTag) {
    return BackupPriority.CRITICAL;
  }

  // Check for high priority tags
  const hasHighPriorityTag = backup.tags?.some((tag) => HIGH_PRIORITY_TAGS.has(tag.toLowerCase()));
  if (hasHighPriorityTag) {
    return BackupPriority.HIGH;
  }

  // Calculate age in days
  const nowMs = Date.now();
  const backupAgeMs = nowMs - backup.createdAt * 1000;
  const backupAgeDays = backupAgeMs / MS_PER_DAY;

  // Recent backups get higher priority
  if (backupAgeDays < RECENT_BACKUP_DAYS) {
    return BackupPriority.RECENT;
  }

  // Old backups get lower priority
  if (backupAgeDays > OLD_BACKUP_DAYS) {
    return BackupPriority.LOW;
  }

  // Default to normal priority
  return BackupPriority.NORMAL;
}

/**
 * Determines which backups should be deleted when over retention limit.
 * Sorts backups by priority (lowest first) and age (oldest first within same priority).
 *
 * Business Rules:
 * - Never delete CRITICAL priority backups
 * - Delete lowest priority backups first
 * - Within same priority, delete oldest backups first
 * - Always preserve at least the most recent backup
 *
 * @param {ReadonlyArray<Backup>} backups - All available backups
 * @param {number} maxBackups - Maximum backups to retain
 * @returns {ReadonlyArray<Backup>} Backups that should be deleted
 *
 * @example
 * const toDelete = getBackupsToDelete(allBackups, 10);
 * console.log(`Need to delete ${toDelete.length} old backups`);
 */
export function getBackupsToDelete(
  backups: ReadonlyArray<Backup>,
  maxBackups: number
): ReadonlyArray<Backup> {
  // If under limit, no deletions needed
  if (backups.length <= maxBackups) {
    return [];
  }

  // Calculate priority for each backup
  const backupsWithPriority = backups.map((backup) => ({
    backup,
    priority: calculateBackupPriority(backup),
  }));

  // Sort by priority (low to high) then by age (old to new)
  const sorted = [...backupsWithPriority].sort((a, b) => {
    // First sort by priority (lower priority gets deleted first)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Within same priority, sort by age (older gets deleted first)
    return a.backup.createdAt - b.backup.createdAt;
  });

  // Calculate how many to delete
  const deleteCount = backups.length - maxBackups;

  // Take the lowest priority/oldest backups, but never delete CRITICAL
  const candidates = sorted
    .filter((item) => item.priority !== BackupPriority.CRITICAL)
    .slice(0, deleteCount);

  return candidates.map((item) => item.backup);
}

/**
 * Determines if a backup should be protected from automatic deletion.
 * Protected backups require manual confirmation to delete.
 *
 * @param {Backup} backup - The backup to check
 * @returns {boolean} True if backup should be protected
 *
 * @example
 * if (isBackupProtected(backup)) {
 *   console.log('This backup requires confirmation to delete');
 * }
 */
export function isBackupProtected(backup: Backup): boolean {
  const priority = calculateBackupPriority(backup);
  return priority >= BackupPriority.HIGH;
}

/**
 * Calculates the age of a backup in days.
 *
 * @param {Backup} backup - The backup to check
 * @returns {number} Age in days (fractional)
 *
 * @example
 * const age = getBackupAgeDays(backup);
 * console.log(`Backup is ${Math.floor(age)} days old`);
 */
export function getBackupAgeDays(backup: Backup): number {
  const nowMs = Date.now();
  const backupAgeMs = nowMs - backup.createdAt * 1000;
  return backupAgeMs / MS_PER_DAY;
}

/**
 * Suggests appropriate tags for a backup based on its characteristics.
 * Helps users categorize backups consistently.
 *
 * @param {string} notes - Backup notes to analyze
 * @returns {string[]} Suggested tags based on notes content
 *
 * @example
 * const tags = suggestBackupTags('Saved before alpha boss fight');
 * // Returns: ['pre-boss']
 */
export function suggestBackupTags(notes: string): string[] {
  if (!notes) return [];

  const suggestions: string[] = [];
  const lowerNotes = notes.toLowerCase();

  // Boss fight keywords
  if (lowerNotes.includes('boss') || lowerNotes.includes('alpha')) {
    suggestions.push('pre-boss');
  }

  // Update/patch keywords
  if (
    lowerNotes.includes('update') ||
    lowerNotes.includes('patch') ||
    lowerNotes.includes('upgrade')
  ) {
    suggestions.push('pre-update');
  }

  // Milestone keywords
  if (
    lowerNotes.includes('milestone') ||
    lowerNotes.includes('achievement') ||
    lowerNotes.includes('completed')
  ) {
    suggestions.push('milestone');
  }

  // Stability keywords
  if (lowerNotes.includes('stable') || lowerNotes.includes('working')) {
    suggestions.push('stable');
  }

  return suggestions;
}
