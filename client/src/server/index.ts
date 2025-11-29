/**
 * @fileoverview Public exports for Server domain.
 * Clean Architecture barrel exports.
 */

// Domain
export type {
  ServerStatus,
  Server,
  BackupSettings,
  UpdateSettingsDto,
  SettingsValidationResult,
} from './domain/server';

export { isTransitionalStatus, createServerFromStatus } from './domain/server';

// Services
export {
  validateBackupInterval,
  validateMaxBackups,
  validateBackupSettings,
  formatBackupInterval,
  MIN_BACKUP_INTERVAL_SECONDS,
  MAX_BACKUP_INTERVAL_SECONDS,
  MIN_BACKUPS_TO_KEEP,
  MAX_BACKUPS_TO_KEEP,
} from './services/settingsValidationService';

// Repository
export { useServerRepository } from './repository/useServerRepository';
export type { UseServerRepositoryReturn } from './repository/useServerRepository';

export { useSettingsRepository } from './repository/useSettingsRepository';
export type { UseSettingsRepositoryReturn } from './repository/useSettingsRepository';

// UseCases
export { useServerControl } from './useCases/useServerControl';
export type { UseServerControlReturn } from './useCases/useServerControl';

export { useUpdateSettings } from './useCases/useUpdateSettings';
export type { UseUpdateSettingsReturn, UseUpdateSettingsProps } from './useCases/useUpdateSettings';
