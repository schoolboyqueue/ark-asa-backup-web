/**
 * @fileoverview Backup domain barrel exports.
 * Provides clean public API for backup operations.
 */

export type { BackupConfig } from './service.js';
export * as backupService from './service.js';
export { createBackupRoutes } from './routes.js';
export type { BackupMetadata, VerificationResult, SaveInfo, BackupSettings } from './types.js';
