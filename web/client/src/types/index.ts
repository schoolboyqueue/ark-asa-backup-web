/**
 * @fileoverview TypeScript type definitions for ARK ASA Backup Manager.
 * Provides type safety for API responses, backup data structures, and configuration.
 * All interfaces follow strict typing conventions for compile-time safety.
 */

/**
 * Metadata for a single backup archive.
 * Contains file information and creation timestamp for backup management.
 *
 * @interface BackupMetadata
 */
export interface BackupMetadata {
  /** Filename of the backup archive (e.g., "backup_2024-01-15_120000.tar.gz") */
  name: string;

  /** Size of the backup file in bytes */
  size_bytes: number;

  /** Modification time as Unix timestamp (seconds since epoch) */
  mtime: number;

  /** Optional human-readable modification time string */
  mtime_human?: string;

  /** Optional user-provided notes for this backup (e.g., "Saved before attempting alpha boss") */
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
 * Configuration settings for automated backup system.
 * Controls backup frequency, retention policy, and safety features.
 *
 * @interface BackupSettings
 */
export interface BackupSettings {
  /**
   * Interval between automatic backups in seconds.
   * Minimum: 60 (1 minute), Maximum: 86400 (24 hours)
   */
  BACKUP_INTERVAL: number;

  /**
   * Maximum number of backup archives to retain.
   * Older backups are automatically deleted when limit is exceeded.
   * Minimum: 1, Maximum: 100
   */
  MAX_BACKUPS: number;

  /**
   * Whether to automatically create a pre-restore safety backup.
   * When enabled, a snapshot is created before any restore operation.
   * Default: true
   */
  AUTO_SAFETY_BACKUP?: boolean;
}

/**
 * Generic API response wrapper with status and optional error information.
 * Provides consistent response format across all API endpoints.
 *
 * @template TData - Type of the data payload (if any)
 * @interface ApiResponse
 */
export interface ApiResponse<TData = unknown> {
  /** Whether the operation succeeded (true) or failed (false) */
  ok: boolean;

  /** Error message if operation failed, undefined on success */
  error?: string;

  /** Optional status message providing additional context */
  status?: string;

  /** Updated backup settings (used by settings endpoint) */
  settings?: BackupSettings;

  /** Generic data payload for flexible response types */
  data?: TData;
}

/**
 * Docker container status for the ARK dedicated server.
 * Reflects current runtime state and health of the server container.
 *
 * @interface ServerStatus
 */
export interface ServerStatus {
  /** Whether the status check succeeded */
  ok: boolean;

  /**
   * Current container state from Docker.
   * - running: Server is active and accepting connections
   * - exited: Server has stopped normally
   * - paused: Server is temporarily suspended
   * - restarting: Server is in restart cycle
   * - removing: Container is being deleted
   * - dead: Container failed and cannot be restarted
   * - created: Container exists but never started
   */
  status: 'running' | 'exited' | 'paused' | 'restarting' | 'removing' | 'dead' | 'created';

  /** Error message if status check failed */
  error?: string;
}

/**
 * Disk space information for the backup storage directory.
 * Provides filesystem capacity and usage statistics.
 *
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

/**
 * Backup system health status information.
 * Tracks scheduler activity and backup success/failure history.
 *
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
