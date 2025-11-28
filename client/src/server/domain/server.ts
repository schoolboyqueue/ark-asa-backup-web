/**
 * @fileoverview Domain models for Server and Settings features.
 * Represents the ARK server control and backup configuration domain.
 *
 * Clean Architecture: Domain Layer
 */

/**
 * Server status representing the current state of the ARK container.
 */
export type ServerStatus =
  | 'running'
  | 'exited'
  | 'paused'
  | 'restarting'
  | 'removing'
  | 'dead'
  | 'created';

/**
 * Server state with metadata.
 */
export interface Server {
  /** Current server status */
  readonly status: ServerStatus;

  /** Whether the server is running (helper property) */
  readonly isRunning: boolean;
}

/**
 * Backup configuration settings.
 */
export interface BackupSettings {
  /** Interval between automatic backups in seconds */
  readonly backupIntervalSeconds: number;

  /** Maximum number of backups to retain */
  readonly maxBackupsToKeep: number;

  /** Whether to automatically create pre-restore safety backup */
  readonly autoSafetyBackup: boolean;
}

/**
 * DTO for updating backup settings.
 */
export interface UpdateSettingsDto {
  readonly backupIntervalSeconds: number;
  readonly maxBackupsToKeep: number;
  readonly autoSafetyBackup: boolean;
}

/**
 * Validation result for settings.
 */
export interface SettingsValidationResult {
  readonly isValid: boolean;
  readonly errors: {
    backupInterval?: string;
    maxBackups?: string;
  };
}
