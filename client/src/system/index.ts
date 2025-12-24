/**
 * @fileoverview Public exports for System domain.
 * Clean Architecture barrel exports.
 */

// Domain exports
export type { BackupHealth, DiskSpace, SystemHealth } from './domain/system';
export type { UseSystemRepositoryReturn } from './repository/useSystemRepository';
// Repository exports
export { useSystemRepository } from './repository/useSystemRepository';

// Adapter is NOT exported - internal implementation detail
