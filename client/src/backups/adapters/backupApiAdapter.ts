/**
 * @fileoverview Backup API adapter for HTTP operations.
 * Implements the port/interface for backup data access via REST API.
 * Hides HTTP implementation details from the domain and use cases.
 *
 * Clean Architecture: Adapter Layer
 * - Communicates with external systems (backend API)
 * - Transforms API responses to domain models
 * - No business logic (just data transformation)
 * - No React hooks or UI concerns
 */

import type {
  Backup,
  CreateBackupDto,
  UpdateBackupMetadataDto,
  VerificationResult,
} from '../domain/backup';

/** Legacy API response type */
interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Legacy BackupMetadata from API (snake_case) */
interface BackupMetadataApi {
  name: string;
  size_bytes: number;
  mtime: number;
  notes?: string;
  tags?: string[];
  verification_status?: 'verified' | 'failed' | 'pending' | 'unknown';
  verification_time?: number;
  verified_file_count?: number;
  verification_error?: string;
}

/**
 * Transforms API backup metadata to domain Backup model.
 * Converts snake_case API fields to camelCase domain fields.
 *
 * @param {BackupMetadataApi} apiBackup - Backup metadata from API
 * @returns {Backup} Domain backup model
 */
function transformApiBackupToDomain(apiBackup: BackupMetadataApi): Backup {
  return {
    name: apiBackup.name,
    sizeBytes: apiBackup.size_bytes,
    createdAt: apiBackup.mtime,
    notes: apiBackup.notes,
    tags: apiBackup.tags,
    verificationStatus: apiBackup.verification_status || 'unknown',
    verificationTime: apiBackup.verification_time,
    verifiedFileCount: apiBackup.verified_file_count,
    verificationError: apiBackup.verification_error,
  };
}

/**
 * Backup API adapter - handles all HTTP communication for backup operations.
 * Provides a clean interface for backup data access without exposing HTTP details.
 */
export const backupApiAdapter = {
  /**
   * Fetches all available backups from the server.
   *
   * @returns {Promise<Backup[]>} Array of backup domain models
   * @throws {Error} When HTTP request fails or server returns error
   */
  async getBackups(): Promise<Backup[]> {
    const response = await fetch(`/api/backups`);

    if (!response.ok) {
      throw new Error(`Failed to fetch backups: HTTP ${response.status}`);
    }

    const apiBackups: BackupMetadataApi[] = await response.json();
    return apiBackups.map(transformApiBackupToDomain);
  },

  /**
   * Creates a new manual backup with optional notes and tags.
   *
   * @param {CreateBackupDto} dto - Backup creation data
   * @returns {Promise<Backup[]>} Updated list of all backups
   * @throws {Error} When HTTP request fails or server returns error
   */
  async createBackup(dto: CreateBackupDto): Promise<Backup[]> {
    const requestBody = {
      notes: dto.notes,
      tags: dto.tags,
    };

    let response;
    try {
      response = await fetch(`/api/backups/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError) {
      console.error('Failed to create backup:', fetchError);
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create backup:', errorText);
      throw new Error(`Failed to create backup: HTTP ${response.status}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[backupApiAdapter] Response not OK:', errorText);
      throw new Error(`Failed to create backup: HTTP ${response.status}`);
    }

    const result: ApiResponse & { backups: BackupMetadataApi[] } = await response.json();

    if (!result.ok) {
      console.error('Failed to create backup:', result.error);
      throw new Error(result.error || 'Failed to create backup');
    }

    return result.backups.map(transformApiBackupToDomain);
  },

  /**
   * Updates backup metadata (notes and tags).
   *
   * @param {UpdateBackupMetadataDto} dto - Metadata update data
   * @returns {Promise<void>} Resolves when update completes
   * @throws {Error} When HTTP request fails or server returns error
   */
  async updateBackupMetadata(dto: UpdateBackupMetadataDto): Promise<void> {
    const response = await fetch(`/api/backups/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backup_name: dto.backupName,
        notes: dto.notes,
        tags: dto.tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update backup metadata: HTTP ${response.status}`);
    }

    const result: ApiResponse = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Failed to update backup metadata');
    }
  },

  /**
   * Deletes a backup archive.
   *
   * @param {string} backupName - Name of backup to delete
   * @returns {Promise<void>} Resolves when deletion completes
   * @throws {Error} When HTTP request fails or server returns error
   */
  async deleteBackup(backupName: string): Promise<void> {
    const response = await fetch(`/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup_name: backupName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete backup: HTTP ${response.status}`);
    }

    const result: ApiResponse = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Failed to delete backup');
    }
  },

  /**
   * Verifies backup archive integrity.
   *
   * @param {string} backupName - Name of backup to verify
   * @returns {Promise<VerificationResult>} Verification result with status and file count
   * @throws {Error} When HTTP request fails or server returns error
   */
  async verifyBackup(backupName: string): Promise<VerificationResult> {
    const response = await fetch(`/api/backups/${encodeURIComponent(backupName)}/verify`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to verify backup: HTTP ${response.status}`);
    }

    const result: ApiResponse & {
      verification: {
        status: 'verified' | 'failed' | 'pending' | 'unknown';
        file_count: number;
        verification_time: number;
        error?: string;
      };
    } = await response.json();

    if (!result.ok) {
      throw new Error(result.error || 'Failed to verify backup');
    }

    return {
      status: result.verification.status,
      fileCount: result.verification.file_count,
      verificationTime: result.verification.verification_time,
      error: result.verification.error,
    };
  },

  /**
   * Downloads a backup archive to user's device.
   * Triggers browser download by creating temporary anchor element.
   *
   * @param {string} backupName - Name of backup to download
   * @returns {Promise<void>} Resolves when download starts
   * @throws {Error} When backup not found
   */
  async downloadBackup(backupName: string): Promise<void> {
    const downloadUrl = `/api/download/${encodeURIComponent(backupName)}`;

    // Create temporary anchor element to trigger download
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = backupName;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  },

  /**
   * Restores a backup with progress tracking via SSE.
   * WARNING: Replaces all current save files.
   *
   * @param {string} backupName - Name of backup to restore
   * @param {(event: { stage: string; percent: number; message?: string }) => void} onProgress - Progress callback
   * @returns {Promise<void>} Resolves when restore completes
   * @throws {Error} When restore fails
   */
  async restoreBackup(
    backupName: string,
    onProgress: (event: { stage: string; percent: number; message?: string }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`/api/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_name: backupName }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('Response body is not readable');
          }

          const readStream = (): void => {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  return;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('event: ')) {
                    const eventType = line.substring(7).trim();
                    const nextLineIndex = lines.indexOf(line) + 1;

                    if (nextLineIndex < lines.length && lines[nextLineIndex].startsWith('data: ')) {
                      const eventData = JSON.parse(lines[nextLineIndex].substring(6));

                      if (eventType === 'progress') {
                        onProgress(eventData);
                      } else if (eventType === 'done') {
                        resolve();
                        return;
                      } else if (eventType === 'error') {
                        reject(new Error(eventData.error || 'Restore failed'));
                        return;
                      }
                    }
                  }
                }

                readStream();
              })
              .catch(reject);
          };

          readStream();
        })
        .catch(reject);
    });
  },

  /**
   * Copies text to clipboard.
   * Abstraction over clipboard API for easier testing and fallbacks.
   *
   * @param {string} text - Text to copy
   * @returns {Promise<void>} Resolves when copy completes
   * @throws {Error} When clipboard operation fails
   */
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  },
};
