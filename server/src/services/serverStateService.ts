/**
 * @fileoverview Server state service for managing transitional server states.
 * Provides application-level state management for server start/stop operations.
 *
 * Design Pattern: Singleton state manager for coordinating between routes and SSE streams.
 *
 * The Docker API reports container states (running, exited, etc.) but doesn't have
 * application-level states like "starting" or "stopping". This service bridges that gap
 * by tracking when operations are in progress and broadcasting transitional states.
 */

import { Logger } from '../utils/logger.js';

/**
 * Application-level server states that supplement Docker container states.
 */
export type TransitionalState = 'starting' | 'stopping' | null;

/**
 * Current transitional state (null means use Docker's reported state).
 */
let currentTransitionalState: TransitionalState = null;

/**
 * Timestamp when transitional state was set (for timeout handling).
 */
let transitionalStateSetAt: number | null = null;

/**
 * Maximum duration for transitional states before auto-clearing (5 minutes).
 * This prevents stuck states if something goes wrong.
 */
const TRANSITIONAL_STATE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Sets the transitional state to 'starting'.
 * Call this before initiating a container start operation.
 */
export function setServerStarting(): void {
  currentTransitionalState = 'starting';
  transitionalStateSetAt = Date.now();
  Logger.info('[ServerState] State set to: starting');
}

/**
 * Sets the transitional state to 'stopping'.
 * Call this before initiating a container stop operation.
 */
export function setServerStopping(): void {
  currentTransitionalState = 'stopping';
  transitionalStateSetAt = Date.now();
  Logger.info('[ServerState] State set to: stopping');
}

/**
 * Clears the transitional state, reverting to Docker's reported state.
 * Call this after a start/stop operation completes (success or failure).
 */
export function clearTransitionalState(): void {
  const previousState = currentTransitionalState;
  currentTransitionalState = null;
  transitionalStateSetAt = null;
  if (previousState) {
    Logger.info(`[ServerState] Cleared transitional state (was: ${previousState})`);
  }
}

/**
 * Gets the current transitional state, if any.
 * Returns null if no transitional state is active or if it has timed out.
 */
export function getTransitionalState(): TransitionalState {
  // Auto-clear stale transitional states
  if (currentTransitionalState && transitionalStateSetAt) {
    const elapsed = Date.now() - transitionalStateSetAt;
    if (elapsed > TRANSITIONAL_STATE_TIMEOUT_MS) {
      Logger.warn(
        `[ServerState] Transitional state '${currentTransitionalState}' timed out after ${Math.round(elapsed / 1000)}s`
      );
      clearTransitionalState();
      return null;
    }
  }

  return currentTransitionalState;
}

/**
 * Determines the effective server status by combining Docker state with transitional state.
 * Transitional states take priority over Docker states during operations.
 *
 * @param dockerStatus - The current status from Docker API
 * @returns The effective status to display to users
 */
export function getEffectiveServerStatus(dockerStatus: string): string {
  const transitionalState = getTransitionalState();

  // If we're in a transitional state, use it
  if (transitionalState) {
    // But clear transitional state if Docker has already reached the target state
    if (transitionalState === 'starting' && dockerStatus === 'running') {
      clearTransitionalState();
      return dockerStatus;
    }
    if (transitionalState === 'stopping' && dockerStatus === 'exited') {
      clearTransitionalState();
      return dockerStatus;
    }

    // Otherwise, report the transitional state
    return transitionalState;
  }

  // No transitional state, use Docker's status
  return dockerStatus;
}
