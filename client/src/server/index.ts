/**
 * @fileoverview Public exports for Server domain.
 * Clean Architecture barrel exports.
 */

// Domain
export type {
  BackupSettings,
  Server,
  ServerStatus,
  SettingsValidationResult,
  UpdateSettingsDto,
} from './domain/server';

export { createServerFromStatus, isTransitionalStatus } from './domain/server';
export type { UseServerRepositoryReturn } from './repository/useServerRepository';

// Repository
export { useServerRepository } from './repository/useServerRepository';
export type { UseSettingsRepositoryReturn } from './repository/useSettingsRepository';

export { useSettingsRepository } from './repository/useSettingsRepository';
// Services
export {
  formatBackupInterval,
  MAX_BACKUP_INTERVAL_SECONDS,
  MAX_BACKUPS_TO_KEEP,
  MIN_BACKUP_INTERVAL_SECONDS,
  MIN_BACKUPS_TO_KEEP,
  validateBackupInterval,
  validateBackupSettings,
  validateMaxBackups,
} from './services/settingsValidationService';
export type { UseServerControlReturn } from './useCases/useServerControl';
// UseCases
export { useServerControl } from './useCases/useServerControl';
export type { UseUpdateSettingsProps, UseUpdateSettingsReturn } from './useCases/useUpdateSettings';
export { useUpdateSettings } from './useCases/useUpdateSettings';
