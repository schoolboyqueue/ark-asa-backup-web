/**
 * @fileoverview System API adapter for health monitoring.
 * Clean Architecture: Adapter Layer
 */

import type {
  BackupHealth,
  BackupHealthApi,
  DiskSpace,
  DiskSpaceApi,
  VersionInfo,
  VersionInfoApi,
} from '../domain/system';

/**
 * Transform API disk space response to domain model.
 */
function transformApiDiskSpaceToDomain(api: DiskSpaceApi): DiskSpace {
  return {
    ok: api.ok,
    totalBytes: api.total_bytes,
    usedBytes: api.used_bytes,
    availableBytes: api.available_bytes,
    usedPercent: api.used_percent,
    error: api.error,
  };
}

/**
 * Transform API backup health response to domain model.
 */
function transformApiBackupHealthToDomain(api: BackupHealthApi): BackupHealth {
  return {
    ok: api.ok,
    schedulerActive: api.scheduler_active,
    lastSuccessfulBackup: api.last_successful_backup,
    lastFailedBackup: api.last_failed_backup,
    lastError: api.last_error,
    error: api.error,
  };
}

/**
 * Transform API version info response to domain model.
 */
function transformApiVersionInfoToDomain(api: VersionInfoApi): VersionInfo {
  return {
    serverVersion: api.server_version,
  };
}

/**
 * Adapter for system health API operations.
 * Hides HTTP implementation and transforms API responses to domain models.
 */
export const systemApiAdapter = {
  /**
   * Fetch disk space information.
   */
  async getDiskSpace(): Promise<DiskSpace> {
    const response = await fetch('/api/disk-space');
    if (!response.ok) {
      throw new Error(`Failed to fetch disk space: HTTP ${response.status}`);
    }
    const apiData: DiskSpaceApi = await response.json();
    return transformApiDiskSpaceToDomain(apiData);
  },

  /**
   * Fetch backup health status.
   */
  async getBackupHealth(): Promise<BackupHealth> {
    const response = await fetch('/api/backup/health');
    if (!response.ok) {
      throw new Error(`Failed to fetch backup health: HTTP ${response.status}`);
    }
    const apiData: BackupHealthApi = await response.json();
    return transformApiBackupHealthToDomain(apiData);
  },
};

// Export transformation functions for use in repository
export {
  transformApiDiskSpaceToDomain,
  transformApiBackupHealthToDomain,
  transformApiVersionInfoToDomain,
};
