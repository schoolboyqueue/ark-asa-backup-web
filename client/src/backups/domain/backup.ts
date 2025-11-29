/**
 * @fileoverview Domain models and types for the Backups feature.
 * Contains core business entities, value objects, and domain-specific types.
 * These types represent the ubiquitous language of the backup domain.
 *
 * Clean Architecture: Domain Layer
 * - Pure TypeScript types and interfaces
 * - No framework dependencies
 * - Represents business concepts and rules
 */

/**
 * Core backup entity representing a backup archive.
 * Immutable value object containing all backup metadata and status.
 */
export interface Backup {
  /** Unique identifier (filename) of the backup archive */
  readonly name: string;

  /** Size of the backup file in bytes */
  readonly sizeBytes: number;

  /** Creation timestamp as Unix timestamp (seconds since epoch) */
  readonly createdAt: number;

  /** Optional user-provided notes describing this backup */
  readonly notes?: string;

  /** Optional tags for categorizing and filtering backups */
  readonly tags?: ReadonlyArray<string>;

  /** Current verification status of the backup archive */
  readonly verificationStatus: VerificationStatus;

  /** Timestamp when verification was last performed (Unix timestamp in seconds) */
  readonly verificationTime?: number;

  /** Number of files found during verification */
  readonly verifiedFileCount?: number;

  /** Error message if verification failed */
  readonly verificationError?: string;
}

/**
 * Verification status for backup integrity checks.
 */
export type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unknown';

/**
 * Data required to create a new backup.
 */
export interface CreateBackupDto {
  /** Optional notes to attach to the backup */
  readonly notes?: string;

  /** Optional tags for categorizing the backup */
  readonly tags?: ReadonlyArray<string>;
}

/**
 * Data required to update backup metadata.
 */
export interface UpdateBackupMetadataDto {
  /** Backup name to update */
  readonly backupName: string;

  /** Updated notes */
  readonly notes: string;

  /** Updated tags */
  readonly tags: ReadonlyArray<string>;
}

/**
 * Result of a backup validation operation.
 */
export interface ValidationResult {
  /** Whether the validation passed */
  readonly isValid: boolean;

  /** Error message if validation failed */
  readonly error?: string;
}

/**
 * Result of a backup verification operation.
 */
export interface VerificationResult {
  /** Verification status */
  readonly status: VerificationStatus;

  /** Number of files found in the backup */
  readonly fileCount: number;

  /** Timestamp when verification was performed */
  readonly verificationTime: number;

  /** Error message if verification failed */
  readonly error?: string;
}

/**
 * Backup retention priority levels for cleanup logic.
 * Higher priority backups are preserved longer during pruning.
 */
export enum BackupPriority {
  /** Critical backups that should never be auto-deleted */
  CRITICAL = 100,
  /** High priority backups (important milestones, pre-boss, etc.) */
  HIGH = 75,
  /** Recent backups (less than 7 days old) */
  RECENT = 50,
  /** Normal priority backups */
  NORMAL = 25,
  /** Low priority backups eligible for deletion */
  LOW = 10,
}

/**
 * Backup sort column options.
 */
export type BackupSortColumn = 'name' | 'size' | 'date';

/**
 * Sort direction options.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Backup filter criteria.
 */
export interface BackupFilters {
  /** Text search query (matches name, notes, tags) */
  readonly searchQuery?: string;

  /** Filter by date range start (ISO date string) */
  readonly dateRangeStart?: string;

  /** Filter by date range end (ISO date string) */
  readonly dateRangeEnd?: string;

  /** Filter by specific tags */
  readonly tags?: ReadonlyArray<string>;

  /** Filter by verification status */
  readonly verificationStatus?: VerificationStatus;
}
