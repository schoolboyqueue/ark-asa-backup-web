/**
 * @fileoverview System domain types for health monitoring.
 * Clean Architecture: Domain Layer
 */

/**
 * Disk space information for the backup storage directory.
 * Immutable domain model with readonly properties.
 */
export interface DiskSpace {
  readonly ok: boolean;
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly availableBytes: number;
  readonly usedPercent: number;
  readonly error?: string;
}

/**
 * Backup system health status information.
 * Tracks scheduler activity and backup history.
 */
export interface BackupHealth {
  readonly ok: boolean;
  readonly schedulerActive: boolean;
  readonly lastSuccessfulBackup: number | null;
  readonly lastFailedBackup: number | null;
  readonly lastError: string | null;
  readonly error?: string;
}

/**
 * System health status combining disk and backup health.
 */
export interface SystemHealth {
  readonly diskSpace: DiskSpace | null;
  readonly backupHealth: BackupHealth | null;
}

/**
 * API response types (snake_case from backend).
 */
export interface DiskSpaceApi {
  ok: boolean;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
  error?: string;
}

export interface BackupHealthApi {
  ok: boolean;
  scheduler_active: boolean;
  last_successful_backup: number | null;
  last_failed_backup: number | null;
  last_error: string | null;
  error?: string;
}

/**
 * Version information for client and server.
 * Used to display application version in system status.
 */
export interface VersionInfo {
  readonly serverVersion: string;
}

/**
 * API response type for version info (snake_case from backend).
 */
export interface VersionInfoApi {
  server_version: string;
}
