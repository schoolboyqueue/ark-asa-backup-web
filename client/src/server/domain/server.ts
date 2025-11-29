/**
 * @fileoverview Domain models for Server and Settings features.
 * Represents the ARK server control and backup configuration domain.
 *
 * Clean Architecture: Domain Layer
 */

/**
 * Server status representing the current state of the ARK container.
 * Includes both Docker container states and application-level transitional states.
 */
export type ServerStatus =
  | 'running'
  | 'exited'
  | 'paused'
  | 'restarting'
  | 'removing'
  | 'dead'
  | 'created'
  | 'starting' // Application state: container start initiated, waiting for running
  | 'stopping'; // Application state: container stop initiated, waiting for exit

/**
 * Server state with metadata.
 */
export interface Server {
  /** Current server status */
  readonly status: ServerStatus;

  /** Whether the server is running (helper property) */
  readonly isRunning: boolean;

  /** Whether the server is in a transitional state (starting or stopping) */
  readonly isTransitioning: boolean;

  /** Whether the server is starting */
  readonly isStarting: boolean;

  /** Whether the server is stopping */
  readonly isStopping: boolean;
}

/**
 * Helper to determine if a status is a transitional state.
 */
export function isTransitionalStatus(status: ServerStatus): boolean {
  return status === 'starting' || status === 'stopping';
}

/**
 * Creates a Server object from a status string.
 */
export function createServerFromStatus(status: ServerStatus): Server {
  return {
    status,
    isRunning: status === 'running',
    isTransitioning: isTransitionalStatus(status),
    isStarting: status === 'starting',
    isStopping: status === 'stopping',
  };
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
