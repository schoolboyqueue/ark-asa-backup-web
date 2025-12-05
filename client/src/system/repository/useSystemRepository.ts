/**
 * @fileoverview System health repository with unified SSE.
 * Manages real-time system health updates.
 *
 * Clean Architecture: Repository Layer
 * - Encapsulates where system data comes from (unified SSE stream)
 * - Converts API models to domain models for the system domain
 * - Tracks loading/error state for disk space and backup health
 */

import { useState, useCallback } from 'react';
import type {
  DiskSpace,
  BackupHealth,
  VersionInfo,
  DiskSpaceApi,
  BackupHealthApi,
  VersionInfoApi,
} from '../domain/system';
import {
  transformApiDiskSpaceToDomain,
  transformApiBackupHealthToDomain,
  transformApiVersionInfoToDomain,
} from '../adapters/systemApiAdapter';
import { useUnifiedStream } from '../../shared/api/useUnifiedStream';

/**
 * Return type for useSystemRepository.
 */
export interface UseSystemRepositoryReturn {
  /** Current disk space state */
  diskSpace: DiskSpace | null;
  /** Current backup health state */
  backupHealth: BackupHealth | null;
  /** Server version information */
  versionInfo: VersionInfo | null;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Error message if failed to load */
  error: string | null;
  /** Manually refresh system status (marks loading until next stream event) */
  refreshSystem: () => void;
}

/**
 * Repository hook for system health status.
 * Subscribes to unified SSE for real-time updates of disk space and backup health.
 */
export function useSystemRepository(): UseSystemRepositoryReturn {
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null);
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable callback references to prevent stream listener re-registration on every render
  const handleDiskSpaceUpdate = useCallback((apiData: DiskSpaceApi) => {
    const domainData = transformApiDiskSpaceToDomain(apiData);
    setDiskSpace(domainData);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleBackupHealthUpdate = useCallback((apiData: BackupHealthApi) => {
    const domainData = transformApiBackupHealthToDomain(apiData);
    setBackupHealth(domainData);
    setIsLoading(false);
  }, []);

  const handleDiskSpaceError = useCallback((data: { ok: boolean; error?: string }) => {
    const errorMessage = data.error || 'Failed to load disk space';
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const handleBackupHealthError = useCallback((data: { ok: boolean; error?: string }) => {
    const errorMessage = data.error || 'Failed to load backup health';
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const handleVersionUpdate = useCallback((apiData: VersionInfoApi) => {
    const domainData = transformApiVersionInfoToDomain(apiData);
    setVersionInfo(domainData);
  }, []);

  useUnifiedStream<DiskSpaceApi>('disk-space', handleDiskSpaceUpdate);
  useUnifiedStream<BackupHealthApi>('backup-health', handleBackupHealthUpdate);
  useUnifiedStream<VersionInfoApi>('version', handleVersionUpdate);
  useUnifiedStream<{ ok: boolean; error?: string }>('disk-space-error', handleDiskSpaceError);
  useUnifiedStream<{ ok: boolean; error?: string }>('backup-health-error', handleBackupHealthError);

  const refreshSystem = useCallback(() => {
    setIsLoading(true);
  }, []);

  return {
    diskSpace,
    backupHealth,
    versionInfo,
    isLoading,
    error,
    refreshSystem,
  };
}
