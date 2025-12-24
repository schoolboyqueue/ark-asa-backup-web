/**
 * @fileoverview ARK Server domain business logic layer.
 * Implements ARK Survival Ascended server control and state management.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Server start/stop/status operations and transitional state tracking
 * **Dependencies:** Repository (Docker API), utilities (logging)
 * **Used By:** Routes
 *
 * **Design:** All configuration is injected as parameters.
 * Module-level state tracks transitional states for better UX.
 */

import type Dockerode from 'dockerode';
import { Logger } from '../../utils/logger.js';
import type { DockerConfig } from './repository.js';
import * as repository from './repository.js';

// ============================================================================
// Transitional State Management
// ============================================================================

export type TransitionalState = 'starting' | 'stopping' | null;

let currentTransitionalState: TransitionalState = null;
let transitionalStateSetAt: number | null = null;

const TRANSITIONAL_STATE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Sets transitional state to 'starting'.
 * Call before initiating a container start operation.
 */
export function setServerStarting(): void {
  currentTransitionalState = 'starting';
  transitionalStateSetAt = Date.now();
  Logger.info('[ArkServer] State set to: starting');
}

/**
 * Sets transitional state to 'stopping'.
 * Call before initiating a container stop operation.
 */
export function setServerStopping(): void {
  currentTransitionalState = 'stopping';
  transitionalStateSetAt = Date.now();
  Logger.info('[ArkServer] State set to: stopping');
}

/**
 * Clears the transitional state.
 * Call after a start/stop operation completes.
 */
export function clearTransitionalState(): void {
  const previousState = currentTransitionalState;
  currentTransitionalState = null;
  transitionalStateSetAt = null;
  if (previousState) {
    Logger.info(`[ArkServer] Cleared transitional state (was: ${previousState})`);
  }
}

/**
 * Gets current transitional state, if any.
 * Auto-clears stale states.
 */
export function getTransitionalState(): TransitionalState {
  if (currentTransitionalState && transitionalStateSetAt) {
    const elapsed = Date.now() - transitionalStateSetAt;
    if (elapsed > TRANSITIONAL_STATE_TIMEOUT_MS) {
      Logger.warn(
        `[ArkServer] Transitional state '${currentTransitionalState}' timed out after ${Math.round(elapsed / 1000)}s`
      );
      clearTransitionalState();
      return null;
    }
  }

  return currentTransitionalState;
}

/**
 * Gets effective server status combining Docker state with transitional state.
 *
 * **Why:** Transitional states take priority during operations for better UX.
 *
 * @param dockerStatus - Status from Docker API
 * @returns Effective status to display to users
 */
export function getEffectiveServerStatus(dockerStatus: string): string {
  const transitionalState = getTransitionalState();

  if (transitionalState) {
    // Clear transitional state if Docker has reached target state
    if (transitionalState === 'starting' && dockerStatus === 'running') {
      clearTransitionalState();
      return dockerStatus;
    }
    if (transitionalState === 'stopping' && dockerStatus === 'exited') {
      clearTransitionalState();
      return dockerStatus;
    }

    return transitionalState;
  }

  return dockerStatus;
}

// ============================================================================
// Server Control Operations
// ============================================================================

/**
 * Gets current server status.
 *
 * **Why:** Provides users with real-time server state for UI updates.
 *
 * @param client - Docker client
 * @param containerName - Container name
 * @returns Server status string
 * @throws Error if container not found
 */
export async function getStatus(client: Dockerode, containerName: string): Promise<string> {
  const container = await repository.getContainer(client, containerName);

  if (!container) {
    throw new Error(`container '${containerName}' not found`);
  }

  return repository.getContainerStatus(container);
}

/**
 * Starts the ARK server container.
 *
 * **Why:** Allows users to start the server from the web interface.
 *
 * @param client - Docker client
 * @param containerName - Container name
 * @returns Server status after starting
 * @throws Error if container not found or start fails
 */
export async function start(client: Dockerode, containerName: string): Promise<string> {
  const container = await repository.getContainer(client, containerName);

  if (!container) {
    throw new Error(`container '${containerName}' not found`);
  }

  return repository.startContainer(container);
}

/**
 * Stops the ARK server container.
 *
 * **Why:** Allows users to stop the server gracefully from the web interface.
 *
 * @param client - Docker client
 * @param config - Docker configuration (for timeout)
 * @returns Server status after stopping
 * @throws Error if container not found or stop fails
 */
export async function stop(client: Dockerode, config: DockerConfig): Promise<string> {
  const container = await repository.getContainer(client, config.containerName);

  if (!container) {
    throw new Error(`container '${config.containerName}' not found`);
  }

  return repository.stopContainer(container, config.stopTimeoutSeconds);
}
