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
  SaveInfo,
  VerificationStatus,
  CreateBackupDto,
  UpdateBackupMetadataDto,
  ValidationResult,
  VerificationResult,
  BackupSortColumn,
  SortDirection,
  BackupFilters,
} from './domain/backup';

export { BackupPriority } from './domain/backup';

// ============================================================================
// Service Layer - Pure business logic functions
// ============================================================================
export {
  validateBackupNotes,
  validateBackupTags,
  canDeleteBackup,
  canRestoreBackup,
  sanitizeBackupNotes,
  sanitizeTags,
} from './services/backupValidationService';

export {
  calculateBackupPriority,
  getBackupsToDelete,
  isBackupProtected,
  getBackupAgeDays,
  suggestBackupTags,
} from './services/backupPriorityService';

export {
  formatFileSize,
  parseFileSize,
  formatTimestamp,
  formatRelativeTime,
  getBackupShortName,
} from './services/backupFormatService';

export type { ParsedFileSize, FileSizeUnit } from './services/backupFormatService';

// ============================================================================
// Repository Layer - State management
// ============================================================================
export { useBackupsRepository } from './repository/useBackupsRepository';
export type { UseBackupsRepositoryReturn } from './repository/useBackupsRepository';

// ============================================================================
// UseCase Layer - Orchestration hooks
// ============================================================================
export { useCreateBackup } from './useCases/useCreateBackup';
export type { UseCreateBackupReturn } from './useCases/useCreateBackup';

export { useDeleteBackup } from './useCases/useDeleteBackup';
export type { UseDeleteBackupReturn } from './useCases/useDeleteBackup';

export { useBackupActions } from './useCases/useBackupActions';
export type { UseBackupActionsReturn } from './useCases/useBackupActions';

export { useUpdateBackupMetadata } from './useCases/useUpdateBackupMetadata';
export type { UseUpdateBackupMetadataReturn } from './useCases/useUpdateBackupMetadata';

// ============================================================================
// UI Helper Hooks
// ============================================================================
export { useRelativeTimeRefresh } from './hooks/useRelativeTimeRefresh';
