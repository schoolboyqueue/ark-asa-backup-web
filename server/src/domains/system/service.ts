/**
 * @fileoverview System domain business logic layer.
 * Implements system monitoring operations.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** System-level monitoring and information
 * **Dependencies:** File system, package.json
 * **Used By:** Health routes, streaming routes
 */

import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../../../package.json');

const SERVER_VERSION: string = packageJson.version || 'unknown';

/**
 * Gets disk space information for a directory.
 *
 * **Why:** Helps users monitor available storage for backups.
 *
 * @param backupDir - Directory to check disk space for
 * @returns Disk space statistics with percentage
 */
export async function getDiskSpaceInfo(backupDir: string): Promise<{
  ok: boolean;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
  error?: string;
}> {
  try {
    const stats = await fs.statfs(backupDir);

    const totalBytes = stats.blocks * stats.bsize;
    const usedBytes = (stats.blocks - stats.bavail) * stats.bsize;
    const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

    return {
      ok: true,
      total_bytes: totalBytes,
      used_bytes: usedBytes,
      available_bytes: stats.bavail * stats.bsize,
      used_percent: usedPercent,
    };
  } catch (error) {
    return {
      ok: false,
      total_bytes: 0,
      used_bytes: 0,
      available_bytes: 0,
      used_percent: 0,
      error: error instanceof Error ? error.message : String(error),
    };
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
