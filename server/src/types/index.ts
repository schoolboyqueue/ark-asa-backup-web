/**
 * @fileoverview Type definitions for ARK ASA Backup Manager backend.
 * Provides TypeScript interfaces for settings, metadata, and verification results.
 */

/**
 * Backup configuration settings interface.
 * Controls backup frequency, retention policy, and safety features.
 * @interface BackupSettings
 */
export interface BackupSettings {
  /** Interval between automatic backups in seconds */
  BACKUP_INTERVAL: number;
  /** Maximum number of backup archives to retain */
  MAX_BACKUPS: number;
  /** Whether to automatically create pre-restore safety backups (default: true) */
  AUTO_SAFETY_BACKUP?: boolean;
}

/**
 * Backup file metadata interface.
 * Contains information about a backup archive including verification status.
 * @interface BackupMetadata
 */
export interface BackupMetadata {
  /** Filename of the backup archive */
  name: string;
  /** File size in bytes */
  size_bytes: number;
  /** Modification time as Unix timestamp in seconds */
  mtime: number;
  /** Optional human-readable timestamp */
  mtime_human?: string;
  /** Optional user-provided notes for this backup */
  notes?: string;
  /** Optional array of tags for categorizing backups (e.g., ["pre-boss-fight", "milestone"]) */
  tags?: string[];
  /** Verification status of the backup archive */
  verification_status?: 'verified' | 'failed' | 'pending' | 'unknown';
  /** Timestamp when verification was last performed (Unix timestamp in seconds) */
  verification_time?: number;
  /** Number of files extracted during verification */
  verified_file_count?: number;
  /** Error message if verification failed */
  verification_error?: string;
}

/**
 * Internal backup file entry with filesystem statistics.
 * Used for sorting and pruning operations.
 * @interface BackupFileEntry
 */
export interface BackupFileEntry {
  /** Filename */
  name: string;
  /** Modification time in milliseconds */
  mtime: number;
  /** Full file path */
  path: string;
}

/**
 * Verification result interface containing status and details.
 * @interface VerificationResult
 */
export interface VerificationResult {
  /** Verification status */
  status: 'verified' | 'failed' | 'pending' | 'unknown';
  /** Number of files found in archive */
  file_count: number;
  /** Unix timestamp when verification was performed */
  verification_time: number;
  /** Error message if verification failed */
  error?: string;
}

/**
 * Backup system health status information.
 * Tracks scheduler activity and backup success/failure history.
 * @interface BackupHealthStatus
 */
export interface BackupHealthStatus {
  /** Whether the health check succeeded */
  ok: boolean;
  /** Whether the backup scheduler loop is currently active */
  scheduler_active: boolean;
  /** Timestamp of last successful backup (Unix timestamp in seconds, null if no successful backups yet) */
  last_successful_backup: number | null;
  /** Timestamp of last failed backup (Unix timestamp in seconds, null if no failures) */
  last_failed_backup: number | null;
  /** Error message from last failed backup (null if no recent failures) */
  last_error: string | null;
  /** Error message if health check failed */
  error?: string;
}

/**
 * Disk space information for the backup storage directory.
 * Provides filesystem capacity and usage statistics.
 * @interface DiskSpace
 */
export interface DiskSpace {
  /** Whether the disk space check succeeded */
  ok: boolean;
  /** Total disk capacity in bytes */
  total_bytes: number;
  /** Used disk space in bytes */
  used_bytes: number;
  /** Available disk space in bytes */
  available_bytes: number;
  /** Percentage of disk space used (0-100) */
  used_percent: number;
  /** Error message if disk space check failed */
  error?: string;
}
