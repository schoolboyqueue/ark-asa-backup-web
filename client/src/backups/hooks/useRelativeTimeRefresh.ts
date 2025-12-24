/**
 * @fileoverview Hook for automatically refreshing relative time displays.
 * Forces component re-renders at intervals to keep "X minutes ago" text accurate.
 *
 * Clean Architecture: UI Helper Hook
 * - Manages refresh timing for relative time displays
 * - Returns a tick counter that changes to trigger re-renders
 */

import { useEffect, useState } from 'react';

/** Default refresh interval in milliseconds (30 seconds) */
const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

/**
 * Hook that triggers re-renders at intervals to refresh relative time displays.
 * Returns a tick value that changes each interval, causing consuming components to re-render.
 *
 * @param intervalMs - Refresh interval in milliseconds (default: 30 seconds)
 * @returns Current tick count (changes trigger re-renders)
 *
 * @example
 * ```typescript
 * function BackupRow({ backup }) {
 *   // This tick changes every 30 seconds, triggering re-render
 *   useRelativeTimeRefresh();
 *
 *   return (
 *     <span>{formatRelativeTime(backup.createdAt)}</span>
 *   );
 * }
 * ```
 */
export function useRelativeTimeRefresh(intervalMs: number = DEFAULT_REFRESH_INTERVAL_MS): number {
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((previousTick) => previousTick + 1);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return tick;
}
