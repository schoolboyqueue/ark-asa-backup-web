/**
 * @fileoverview Server status repository with SSE.
 * Manages real-time server status updates.
 *
 * Clean Architecture: Repository Layer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Server } from '../domain/server';

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

  /** Manually refresh server status */
  refreshServer: () => void;
}

/**
 * Repository hook for server status.
 * Subscribes to SSE for real-time updates.
 */
export function useServerRepository(): UseServerRepositoryReturn {
  const [server, setServer] = useState<Server | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToServerStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/server/status/stream');
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('[ServerRepository] SSE connected');
      setError(null);
    });

    eventSource.addEventListener('status', (messageEvent) => {
      const data = JSON.parse(messageEvent.data);
      if (data.ok && data.status) {
        setServer({
          status: data.status,
          isRunning: data.status === 'running',
        });
        setIsLoading(false);
        setError(null);
      }
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const data = JSON.parse((messageEvent as MessageEvent).data || '{}');
      const errorMessage = data.error || 'Failed to load server status';
      console.error('[ServerRepository] SSE error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    });

    eventSource.onerror = () => {
      console.error('[ServerRepository] SSE connection error');
      setError('Lost connection to server');
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    connectToServerStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connectToServerStream]);

  const refreshServer = useCallback(() => {
    setIsLoading(true);
    connectToServerStream();
  }, [connectToServerStream]);

  return {
    server,
    isLoading,
    error,
    refreshServer,
  };
}
