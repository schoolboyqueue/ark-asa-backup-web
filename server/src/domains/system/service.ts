/**
 * @fileoverview System domain business logic layer.
 * Implements system monitoring operations.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** System-level monitoring and information
 * **Dependencies:** File system, package.json
 * **Used By:** Health routes, streaming routes
 */

import { promises as fs } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

const SERVER_VERSION: string = packageJson.version || 'unknown';

/**
 * Gets disk space information for a directory.
 *
 * **Why:** Helps users monitor available storage for backups.
 *
 * @param backupDir - Directory to check disk space for
 * @returns Disk space statistics
 */
export async function getDiskSpaceInfo(backupDir: string): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  try {
    const stats = await fs.statfs(backupDir);

    return {
      total: stats.blocks * stats.bsize,
      used: (stats.blocks - stats.bavail) * stats.bsize,
      available: stats.bavail * stats.bsize,
    };
  } catch (error) {
    throw new Error(
      `Failed to get disk space info: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gets application version.
 *
 * **Why:** Allows clients to verify compatibility.
 *
 * @returns Server version string
 */
export function getVersion(): string {
  return SERVER_VERSION;
}
