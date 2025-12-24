/**
 * @fileoverview Public exports for the Backups domain.
 * Provides clean barrel exports following Clean Architecture principles.
 *
 * Import hierarchy:
 * - Domain models and types (pure)
 * - Service functions (pure business logic)
 * - Repository hooks (state management)
 * - UseCase hooks (orchestration)
 * - Adapter is internal (not exported - used only by UseCases)
 */

// ============================================================================
// Domain Layer - Pure types and models
// ============================================================================
export type {
  Backup,
  BackupFilters,
  BackupSortColumn,
  CreateBackupDto,
  SaveInfo,
  SortDirection,
  UpdateBackupMetadataDto,
  ValidationResult,
  VerificationResult,
  VerificationStatus,
} from './domain/backup';

export { BackupPriority } from './domain/backup';
// ============================================================================
// UI Helper Hooks
// ============================================================================
export { useRelativeTimeRefresh } from './hooks/useRelativeTimeRefresh';
export type { UseBackupsRepositoryReturn } from './repository/useBackupsRepository';
// ============================================================================
// Repository Layer - State management
// ============================================================================
export { useBackupsRepository } from './repository/useBackupsRepository';

export type { FileSizeUnit, ParsedFileSize } from './services/backupFormatService';
export {
  formatFileSize,
  formatRelativeTime,
  formatTimestamp,
  getBackupShortName,
  parseFileSize,
} from './services/backupFormatService';
export {
  calculateBackupPriority,
  getBackupAgeDays,
  getBackupsToDelete,
  isBackupProtected,
  suggestBackupTags,
} from './services/backupPriorityService';
// ============================================================================
// Service Layer - Pure business logic functions
// ============================================================================
export {
  canDeleteBackup,
  canRestoreBackup,
  sanitizeBackupNotes,
  sanitizeTags,
  validateBackupNotes,
  validateBackupTags,
} from './services/backupValidationService';
export type { UseBackupActionsReturn } from './useCases/useBackupActions';
export { useBackupActions } from './useCases/useBackupActions';
export type { UseCreateBackupReturn } from './useCases/useCreateBackup';
// ============================================================================
// UseCase Layer - Orchestration hooks
// ============================================================================
export { useCreateBackup } from './useCases/useCreateBackup';
export type { UseDeleteBackupReturn } from './useCases/useDeleteBackup';
export { useDeleteBackup } from './useCases/useDeleteBackup';
export type { UseUpdateBackupMetadataReturn } from './useCases/useUpdateBackupMetadata';
export { useUpdateBackupMetadata } from './useCases/useUpdateBackupMetadata';
