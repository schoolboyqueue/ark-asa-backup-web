/**
 * @fileoverview Configuration constants for ARK ASA Backup Manager.
 * Centralized configuration values for paths, limits, and environment variables.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { BackupSettings } from '../types/index.js';

// ES Module __dirname equivalent
const currentFilePath = fileURLToPath(import.meta.url);
export const currentDirectoryPath = dirname(currentFilePath);

// ============================================================================
// Path Configuration
// ============================================================================

/**
 * Detect if running in Docker vs dev mode.
 * Docker: paths like /config exist at root
 * Dev: use relative paths from project root (one level up from server/)
 */
const isDocker = process.env.DOCKER_ENV === 'true';
const projectRoot = isDocker ? '' : `${process.cwd()}/..`;

/** Path to persistent configuration file */
export const CONFIGURATION_FILE_PATH = isDocker
  ? '/config/settings.env'
  : `${projectRoot}/config/settings.env`;

/** Directory for storing backup archives */
export const BACKUP_STORAGE_DIRECTORY = isDocker ? '/backups' : `${projectRoot}/backups`;

/** Directory containing ARK save files */
export const ARK_SAVE_DIRECTORY = isDocker ? '/save' : `${projectRoot}/save`;

/** Unix socket path for Docker daemon */
export const DOCKER_DAEMON_SOCKET = '/var/run/docker.sock';

// ============================================================================
// Environment Variables
// ============================================================================

/** Name/ID of the ARK server Docker container */
export const ARK_SERVER_CONTAINER_NAME = process.env.ARK_BACKUP_CONTAINER_NAME || 'ark-asa';

/** HTTP server port */
export const HTTP_SERVER_PORT = parseInt(process.env.PORT || '8080', 10);

/** Process user ID for file ownership */
export const PROCESS_USER_ID = parseInt(process.env.PUID || '1000', 10);

/** Process group ID for file ownership */
export const PROCESS_GROUP_ID = parseInt(process.env.PGID || '1000', 10);

// ============================================================================
// Limits and Constraints
// ============================================================================

/** Minimum allowed backup interval in seconds (1 minute) */
export const MINIMUM_BACKUP_INTERVAL_SECONDS = 60;

/** Minimum allowed backup retention count */
export const MINIMUM_BACKUP_RETENTION_COUNT = 1;

/** Minimum wait time between backup loop iterations in milliseconds */
export const MINIMUM_LOOP_WAIT_MILLISECONDS = 60000;

/** Docker container stop timeout in seconds */
export const CONTAINER_STOP_TIMEOUT_SECONDS = 60;

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default backup settings used when no configuration file exists.
 * @constant DEFAULT_BACKUP_SETTINGS
 */
export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  BACKUP_INTERVAL: 1800, // 30 minutes in seconds
  MAX_BACKUPS: 10,
  AUTO_SAFETY_BACKUP: true,
};
