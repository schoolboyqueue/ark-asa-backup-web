/**
 * @fileoverview Backup domain barrel exports.
 * Provides clean public API for backup operations.
 */

export { createBackupRoutes } from './routes.js';
export type { BackupConfig } from './service.js';
export * as backupService from './service.js';
export type { BackupMetadata, BackupSettings, SaveInfo, VerificationResult } from './types.js';
