/**
 * @fileoverview Public exports for System domain.
 * Clean Architecture barrel exports.
 */

// Domain exports
export type { DiskSpace, BackupHealth, SystemHealth } from './domain/system';

// Repository exports
export { useSystemRepository } from './repository/useSystemRepository';
export type { UseSystemRepositoryReturn } from './repository/useSystemRepository';

// Adapter is NOT exported - internal implementation detail
