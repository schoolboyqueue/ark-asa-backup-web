/**
 * @fileoverview Backups repository for state management using unified HTTP streaming.
 *
 * Clean Architecture: Repository Layer
 * - Encapsulates where backups data comes from (unified HTTP stream + manual fetch refresh)
 * - Transforms API models to domain backups
 * - Provides loading/error state and optimistic helpers for UI
 */

import { useState, useCallback } from 'react';
import type { Backup, SaveInfo } from '../domain/backup';
import { useUnifiedStream } from '../../shared/api/useUnifiedStream';
import { backupApiAdapter } from '../adapters/backupApiAdapter';

/** API SaveInfo type (snake_case) */
interface SaveInfoApi {
  map_name: string;
  map_display_name: string;
  player_count: number;
  tribe_count: number;
  auto_save_count: number;
  main_save_size_bytes: number;
  total_file_count: number;
  suggested_tags: string[];
}

interface BackupMetadataApi {
  name: string;
  size_bytes: number;
  mtime: number;
  notes?: string;
  tags?: string[];
  verification_status?: 'verified' | 'failed' | 'pending' | 'unknown';
  verification_time?: number;
  verified_file_count?: number;
  verification_error?: string;
  save_info?: SaveInfoApi;
}

/**
 * Transforms API SaveInfo (snake_case) to domain SaveInfo (camelCase).
 */
function transformApiSaveInfo(apiSaveInfo: SaveInfoApi): SaveInfo {
  return {
    mapName: apiSaveInfo.map_name,
    mapDisplayName: apiSaveInfo.map_display_name,
    playerCount: apiSaveInfo.player_count,
    tribeCount: apiSaveInfo.tribe_count,
    autoSaveCount: apiSaveInfo.auto_save_count,
    mainSaveSizeBytes: apiSaveInfo.main_save_size_bytes,
    totalFileCount: apiSaveInfo.total_file_count,
    suggestedTags: apiSaveInfo.suggested_tags,
  };
}

function transformApiBackup(api: BackupMetadataApi): Backup {
  return {
    name: api.name,
    sizeBytes: api.size_bytes,
    createdAt: api.mtime,
    notes: api.notes,
    tags: api.tags,
    verificationStatus: api.verification_status || 'unknown',
    verificationTime: api.verification_time,
    verifiedFileCount: api.verified_file_count,
    verificationError: api.verification_error,
    saveInfo: api.save_info ? transformApiSaveInfo(api.save_info) : undefined,
  };
}

export interface UseBackupsRepositoryReturn {
  /** Current list of backups (newest first) */
  backups: ReadonlyArray<Backup>;
  /** Whether initial backups load is in progress */
  isLoading: boolean;
  /** Error message if backups failed to load */
  error: string | null;
  /** Manually refresh the backups list */
  refreshBackups: () => void;
  /** Optimistically update a backup */
  updateBackup: (backup: Backup) => void;
  /** Optimistically add a backup */
  addBackup: (backup: Backup) => void;
  /** Optimistically remove a backup */
  removeBackup: (backupName: string) => void;
}

export function useBackupsRepository(): UseBackupsRepositoryReturn {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sortBackups = useCallback((backupsList: Backup[]): Backup[] => {
    return [...backupsList].sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  // Stable callback references to prevent SSE listener re-registration on every render
  const handleBackupsUpdate = useCallback(
    (apiBackups: BackupMetadataApi[]) => {
      const domainBackups = apiBackups.map(transformApiBackup);
      const sorted = sortBackups(domainBackups);
      setBackups(sorted);
      setIsLoading(false);
      setError(null);
    },
    [sortBackups]
  );

  const handleBackupsError = useCallback((data: { ok: boolean; error?: string }) => {
    const errorMessage = data.error || 'Failed to load backups';
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  useUnifiedStream<BackupMetadataApi[]>('backups', handleBackupsUpdate);
  useUnifiedStream<{ ok: boolean; error?: string }>('backups-error', handleBackupsError);

  const refreshBackups = useCallback(() => {
    setIsLoading(true);
    // Manually fetch once to refresh immediately
    backupApiAdapter
      .getBackups()
      .then((apiBackups) => {
        const sorted = sortBackups(apiBackups);
        setBackups(sorted);
        setError(null);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load backups';
        setError(errorMessage);
      })
      .finally(() => setIsLoading(false));
  }, [sortBackups]);

  const updateBackup = useCallback(
    (updatedBackup: Backup) => {
      setBackups((current) => {
        const updated = current.map((backup) =>
          backup.name === updatedBackup.name ? updatedBackup : backup
        );
        return sortBackups(updated);
      });
    },
    [sortBackups]
  );

  const addBackup = useCallback(
    (newBackup: Backup) => {
      setBackups((current) => {
        const updated = [...current, newBackup];
        return sortBackups(updated);
      });
    },
    [sortBackups]
  );

  const removeBackup = useCallback((backupName: string) => {
    setBackups((current) => current.filter((backup) => backup.name !== backupName));
  }, []);

  return {
    backups,
    isLoading,
    error,
    refreshBackups,
    updateBackup,
    addBackup,
    removeBackup,
  };
}
