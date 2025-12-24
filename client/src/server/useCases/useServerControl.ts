/**
 * @fileoverview UseCase for server control (start/stop).
 * Orchestrates server start/stop operations.
 *
 * Clean Architecture: UseCase Layer
 */

import { useCallback, useState } from 'react';
import { toast } from '../../shared/services/toast';
import { serverApiAdapter } from '../adapters/serverApiAdapter';

/**
 * Return type for useServerControl.
 */
export interface UseServerControlReturn {
  /** Whether server start is in progress */
  isStarting: boolean;

  /** Whether server stop is in progress */
  isStopping: boolean;

  /** Starts the ARK server */
  startServer: () => Promise<void>;

  /** Stops the ARK server */
  stopServer: () => Promise<void>;
}

/**
 * UseCase hook for server control operations.
 */
export function useServerControl(): UseServerControlReturn {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const startServer = useCallback(async () => {
    setIsStarting(true);
    try {
      await serverApiAdapter.startServer();
      toast.success('ARK server started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start server';
      console.error('Failed to start server:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopServer = useCallback(async () => {
    setIsStopping(true);
    try {
      await serverApiAdapter.stopServer();
      toast.success('ARK server stopped successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop server';
      console.error('Failed to stop server:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsStopping(false);
    }
  }, []);

  return {
    isStarting,
    isStopping,
    startServer,
    stopServer,
  };
}
