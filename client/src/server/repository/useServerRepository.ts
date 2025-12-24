/**
 * @fileoverview Server status repository with unified HTTP streaming.
 * Manages real-time server status updates.
 *
 * Clean Architecture: Repository Layer
 * - Encapsulates where server data comes from (unified HTTP stream)
 * - Provides a stable API for consumers
 * - Handles loading/error state for the server domain
 */

import { useCallback, useState } from 'react';
import { useUnifiedStream } from '../../shared/api/useUnifiedStream';
import type { Server, ServerStatus } from '../domain/server';
import { createServerFromStatus } from '../domain/server';

/**
 * Return type for useServerRepository.
 */
export interface UseServerRepositoryReturn {
  /** Current server state */
  server: Server | null;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Error message if failed to load */
  error: string | null;
  /** Manually refresh server status (marks loading until next stream event) */
  refreshServer: () => void;
}

/**
 * Repository hook for server status.
 * Subscribes to unified HTTP stream for real-time updates.
 * Acts as the single source of truth for server status in the client.
 */
export function useServerRepository(): UseServerRepositoryReturn {
  const [server, setServer] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable callback references to prevent stream listener re-registration on every render
  const handleServerStatusUpdate = useCallback((data: { ok: boolean; status: string }) => {
    if (data.ok && data.status) {
      const status = data.status as ServerStatus;
      setServer(createServerFromStatus(status));
      setIsLoading(false);
      setError(null);
    }
  }, []);

  const handleServerStatusError = useCallback((data: { ok: boolean; error?: string }) => {
    const errorMessage = data.error || 'Failed to load server status';
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  useUnifiedStream<{ ok: boolean; status: string }>('server-status', handleServerStatusUpdate);
  useUnifiedStream<{ ok: boolean; error?: string }>('server-status-error', handleServerStatusError);

  const refreshServer = useCallback(() => {
    setIsLoading(true);
  }, []);

  return {
    server,
    isLoading,
    error,
    refreshServer,
  };
}
