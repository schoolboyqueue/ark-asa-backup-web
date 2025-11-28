/**
 * @fileoverview Server status repository with unified SSE.
 * Manages real-time server status updates.
 *
 * Clean Architecture: Repository Layer
 * - Encapsulates where server data comes from (unified SSE stream)
 * - Provides a stable API for consumers
 * - Handles loading/error state for the server domain
 */

import { useState, useCallback } from 'react';
import type { Server } from '../domain/server';
import { useUnifiedSSE } from '../../shared/api/useUnifiedSSE';

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
  /** Manually refresh server status (marks loading until next SSE event) */
  refreshServer: () => void;
}

/**
 * Repository hook for server status.
 * Subscribes to unified SSE for real-time updates.
 * Acts as the single source of truth for server status in the client.
 */
export function useServerRepository(): UseServerRepositoryReturn {
  const [server, setServer] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useUnifiedSSE<{ ok: boolean; status: string }>('server-status', (data) => {
    if (data.ok && data.status) {
      const status = data.status as Server['status'];
      setServer({ status, isRunning: status === 'running' });
      setIsLoading(false);
      setError(null);
    }
  });

  useUnifiedSSE<{ ok: boolean; error?: string }>('server-status-error', (data) => {
    const errorMessage = data.error || 'Failed to load server status';
    setError(errorMessage);
    setIsLoading(false);
  });

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
