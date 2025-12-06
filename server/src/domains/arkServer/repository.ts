/**
 * @fileoverview Server domain data-access layer.
 * Handles Docker API interactions.
 *
 * **Layer:** Data-Access / Persistence
 * **Responsibility:** Docker daemon communication
 * **Dependencies:** Docker modem
 * **Used By:** Server service
 */

import Dockerode from 'dockerode';

/**
 * Configuration for Docker access.
 */
export interface DockerConfig {
  socketPath: string;
  containerName: string;
  stopTimeoutSeconds: number;
}

/**
 * Gets or creates Docker client instance.
 *
 * @param config - Docker configuration
 * @returns Docker client instance
 */
export function getDockerClient(config: DockerConfig): Dockerode {
  return new Dockerode({ socketPath: config.socketPath });
}

/**
 * Gets the ARK server container instance.
 *
 * @param client - Docker client
 * @param containerName - Name of the container
 * @returns Container instance or null if not found
 */
export async function getContainer(
  client: Dockerode,
  containerName: string
): Promise<Dockerode.Container | null> {
  try {
    const container = client.getContainer(containerName);
    await container.inspect();
    return container;
  } catch {
    return null;
  }
}

/**
 * Gets container status.
 *
 * @param container - Docker container
 * @returns Container status string (running, exited, etc.)
 */
export async function getContainerStatus(container: Dockerode.Container): Promise<string> {
  const info = await container.inspect();
  return info.State.Status;
}

/**
 * Starts a container.
 *
 * @param container - Docker container
 * @returns Container status after starting
 */
export async function startContainer(container: Dockerode.Container): Promise<string> {
  await container.start();
  return getContainerStatus(container);
}

/**
 * Stops a container with timeout.
 *
 * @param container - Docker container
 * @param timeoutSeconds - Timeout in seconds
 * @returns Container status after stopping
 */
export async function stopContainer(
  container: Dockerode.Container,
  timeoutSeconds: number
): Promise<string> {
  await container.stop({ t: timeoutSeconds });
  return getContainerStatus(container);
}
