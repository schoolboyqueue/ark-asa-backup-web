/**
 * @fileoverview Docker container management service for ARK ASA Backup Manager.
 * Handles Docker client initialization, container control, and status checks.
 *
 * Design Pattern: Facade - Simplifies Docker API interactions
 */

import Dockerode from 'dockerode';
import {
  DOCKER_DAEMON_SOCKET,
  ARK_SERVER_CONTAINER_NAME,
  CONTAINER_STOP_TIMEOUT_SECONDS,
} from '../config/constants.js';

// ============================================================================
// Docker Client Initialization
// ============================================================================

/** Docker client instance for container management (Singleton) */
const dockerClient = new Dockerode({ socketPath: DOCKER_DAEMON_SOCKET });

// ============================================================================
// Container Operations
// ============================================================================

/**
 * Retrieves the ARK server Docker container instance if it exists.
 * Verifies container existence by attempting inspection.
 *
 * @returns {Promise<Dockerode.Container | null>} Container instance or null if not found
 * @async
 */
export async function getArkServerContainer(): Promise<Dockerode.Container | null> {
  try {
    const containerInstance = dockerClient.getContainer(ARK_SERVER_CONTAINER_NAME);
    // Verify container exists by inspecting it
    await containerInstance.inspect();
    return containerInstance;
  } catch (containerError) {
    return null;
  }
}

/**
 * Gets the current status of the ARK server container.
 *
 * @returns {Promise<string | null>} Container status (e.g., 'running', 'exited') or null if not found
 * @async
 */
export async function getContainerStatus(): Promise<string | null> {
  const arkContainer = await getArkServerContainer();

  if (!arkContainer) {
    return null;
  }

  const containerInspectionData = await arkContainer.inspect();
  return containerInspectionData.State.Status;
}

/**
 * Starts the ARK server Docker container.
 *
 * @returns {Promise<string>} Container status after starting
 * @throws {Error} If container not found or start operation fails
 * @async
 */
export async function startContainer(): Promise<string> {
  const arkContainer = await getArkServerContainer();

  if (!arkContainer) {
    throw new Error(`Container '${ARK_SERVER_CONTAINER_NAME}' not found`);
  }

  await arkContainer.start();
  const containerInspectionData = await arkContainer.inspect();
  return containerInspectionData.State.Status;
}

/**
 * Stops the ARK server Docker container with graceful shutdown timeout.
 *
 * @returns {Promise<string>} Container status after stopping
 * @throws {Error} If container not found or stop operation fails
 * @async
 */
export async function stopContainer(): Promise<string> {
  const arkContainer = await getArkServerContainer();

  if (!arkContainer) {
    throw new Error(`Container '${ARK_SERVER_CONTAINER_NAME}' not found`);
  }

  await arkContainer.stop({ t: CONTAINER_STOP_TIMEOUT_SECONDS });
  const containerInspectionData = await arkContainer.inspect();
  return containerInspectionData.State.Status;
}

/**
 * Gets full container inspection data.
 *
 * @returns {Promise<Dockerode.ContainerInspectInfo | null>} Full inspection data or null if not found
 * @async
 */
export async function inspectContainer(): Promise<Dockerode.ContainerInspectInfo | null> {
  const arkContainer = await getArkServerContainer();

  if (!arkContainer) {
    return null;
  }

  return await arkContainer.inspect();
}
