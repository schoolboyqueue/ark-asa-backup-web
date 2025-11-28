/**
 * @fileoverview System health repository with SSE.
 * Manages real-time system health updates.
 *
 * Clean Architecture: Repository Layer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DiskSpace, BackupHealth, DiskSpaceApi, BackupHealthApi } from '../domain/system';
import {
  transformApiDiskSpaceToDomain,
  transformApiBackupHealthToDomain,
} from '../adapters/systemApiAdapter';

/**
 * Return type for useSystemRepository.
 */
export interface UseSystemRepositoryReturn {
  /** Current disk space state */
  diskSpace: DiskSpace | null;

  /** Current backup health state */
  backupHealth: BackupHealth | null;

  /** Whether initial load is in progress */
  isLoading: boolean;

  /** Error message if failed to load */
  error: string | null;

  /** Manually refresh system status */
  refreshSystem: () => void;
}

/**
 * Repository hook for system health status.
 * Subscribes to SSE for real-time updates of disk space and backup health.
 */
export function useSystemRepository(): UseSystemRepositoryReturn {
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null);
  const [backupHealth, setBackupHealth] = useState<BackupHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const diskSpaceEventSourceRef = useRef<EventSource | null>(null);
  const backupHealthEventSourceRef = useRef<EventSource | null>(null);

  const connectToSystemStreams = useCallback(() => {
    // Close existing connections
    if (diskSpaceEventSourceRef.current) {
      diskSpaceEventSourceRef.current.close();
    }
    if (backupHealthEventSourceRef.current) {
      backupHealthEventSourceRef.current.close();
    }

    // Disk space stream
    const diskSpaceEventSource = new EventSource('/api/disk-space/stream');
    diskSpaceEventSourceRef.current = diskSpaceEventSource;

    diskSpaceEventSource.addEventListener('connected', () => {
      console.log('[SystemRepository] Disk space SSE connected');
      setError(null);
    });

    diskSpaceEventSource.addEventListener('disk-space', (messageEvent) => {
      const apiData: DiskSpaceApi = JSON.parse(messageEvent.data);
      const domainData = transformApiDiskSpaceToDomain(apiData);
      setDiskSpace(domainData);
      setIsLoading(false);
      setError(null);
    });

    diskSpaceEventSource.addEventListener('error', (messageEvent) => {
      const data = JSON.parse((messageEvent as MessageEvent).data || '{}');
      const errorMessage = data.error || 'Failed to load disk space';
      console.error('[SystemRepository] Disk space SSE error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    });

    diskSpaceEventSource.onerror = () => {
      console.error('[SystemRepository] Disk space SSE connection error');
      setError('Lost connection to server');
      diskSpaceEventSource.close();
    };

    // Backup health stream
    const backupHealthEventSource = new EventSource('/api/backup/health/stream');
    backupHealthEventSourceRef.current = backupHealthEventSource;

    backupHealthEventSource.addEventListener('connected', () => {
      console.log('[SystemRepository] Backup health SSE connected');
    });

    backupHealthEventSource.addEventListener('health', (messageEvent) => {
      const apiData: BackupHealthApi = JSON.parse(messageEvent.data);
      const domainData = transformApiBackupHealthToDomain(apiData);
      setBackupHealth(domainData);
      setIsLoading(false);
    });

    backupHealthEventSource.addEventListener('error', (messageEvent) => {
      const data = JSON.parse((messageEvent as MessageEvent).data || '{}');
      const errorMessage = data.error || 'Failed to load backup health';
      console.error('[SystemRepository] Backup health SSE error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    });

    backupHealthEventSource.onerror = () => {
      console.error('[SystemRepository] Backup health SSE connection error');
      backupHealthEventSource.close();
    };
  }, []);

  useEffect(() => {
    connectToSystemStreams();

    return () => {
      if (diskSpaceEventSourceRef.current) {
        diskSpaceEventSourceRef.current.close();
        diskSpaceEventSourceRef.current = null;
      }
      if (backupHealthEventSourceRef.current) {
        backupHealthEventSourceRef.current.close();
        backupHealthEventSourceRef.current = null;
      }
    };
  }, [connectToSystemStreams]);

  const refreshSystem = useCallback(() => {
    setIsLoading(true);
    connectToSystemStreams();
  }, [connectToSystemStreams]);

  return {
    diskSpace,
    backupHealth,
    isLoading,
    error,
    refreshSystem,
  };
}
