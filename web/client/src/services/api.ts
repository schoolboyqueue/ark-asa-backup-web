/**
 * @fileoverview API service layer for ARK ASA Backup Manager.
 * Provides centralized HTTP client with type-safe methods for all backend operations.
 * Implements singleton pattern for consistent API access across the application.
 */

import type {
  BackupMetadata,
  BackupSettings,
  ApiResponse,
  ServerStatus,
  DiskSpace,
  BackupHealthStatus,
} from '../types';

/**
 * Centralized API service class for managing all backend HTTP requests.
 * Features:
 * - Type-safe request/response handling
 * - Consistent error handling
 * - JSON content-type enforcement
 * - Single responsibility: API communication only
 *
 * Design Patterns:
 * - Singleton: Single instance exported for app-wide use
 * - Facade: Simplifies complex HTTP operations into simple method calls
 * - Repository: Abstracts data access from business logic
 *
 * @class ApiService
 */
class ApiService {
  /**
   * Generic HTTP fetch wrapper with JSON handling and error management.
   * Automatically sets JSON content-type header and parses responses.
   * Throws descriptive errors for non-OK HTTP responses.
   *
   * @template TResponse - Expected response type
   * @param {string} apiUrl - The API endpoint URL to fetch
   * @param {RequestInit} [requestOptions] - Optional fetch configuration
   * @returns {Promise<TResponse>} Parsed JSON response
   * @throws {Error} When HTTP response is not OK (status >= 400)
   * @private
   * @async
   */
  private async fetchJson<TResponse>(
    apiUrl: string,
    requestOptions?: RequestInit
  ): Promise<TResponse> {
    const httpResponse = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...requestOptions?.headers,
      },
      ...requestOptions,
    });

    if (!httpResponse.ok) {
      throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
    }

    return httpResponse.json();
  }

  /**
   * Fetches current backup settings configuration.
   *
   * @returns {Promise<BackupSettings>} Current backup interval and retention settings
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async getSettings(): Promise<BackupSettings> {
    return this.fetchJson<BackupSettings>('/api/settings');
  }

  /**
   * Updates backup settings configuration.
   *
   * @param {BackupSettings} updatedSettings - New settings to apply
   * @returns {Promise<ApiResponse>} Success confirmation with updated settings
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async updateSettings(updatedSettings: BackupSettings): Promise<ApiResponse> {
    return this.fetchJson<ApiResponse>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(updatedSettings),
    });
  }

  /**
   * Fetches list of all available backup archives.
   *
   * @returns {Promise<BackupMetadata[]>} Array of backup metadata objects
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async getBackups(): Promise<BackupMetadata[]> {
    return this.fetchJson<BackupMetadata[]>('/api/backups');
  }

  /**
   * Triggers an immediate manual backup outside the automatic schedule.
   * Creates a new backup archive and prunes old backups according to current settings.
   *
   * @param {string} [notes] - Optional user-provided notes or tags for this backup
   * @returns {Promise<ApiResponse & { backups: BackupMetadata[] }>} Success confirmation with updated backup list
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async triggerBackup(notes?: string): Promise<ApiResponse & { backups: BackupMetadata[] }> {
    return this.fetchJson<ApiResponse & { backups: BackupMetadata[] }>('/api/backups/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });
  }

  /**
   * Updates the notes for a specific backup archive.
   * Updates the .meta.json file associated with the backup.
   *
   * @param {string} backupName - Name of the backup to update notes for
   * @param {string} [notes] - New notes text, or undefined to remove notes
   * @returns {Promise<ApiResponse>} Success confirmation
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async updateBackupNotes(backupName: string, notes?: string): Promise<ApiResponse> {
    return this.fetchJson<ApiResponse>('/api/backups/notes', {
      method: 'PUT',
      body: JSON.stringify({ backup_name: backupName, notes }),
    });
  }

  /**
   * Updates the metadata (notes and tags) for a specific backup archive.
   * Updates the .meta.json file associated with the backup.
   *
   * @param {string} backupName - Name of the backup to update metadata for
   * @param {string} notes - Notes text for the backup
   * @param {string[]} tags - Array of tags for categorizing the backup
   * @returns {Promise<ApiResponse>} Success confirmation
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async updateBackupMetadata(
    backupName: string,
    notes: string,
    tags: string[]
  ): Promise<ApiResponse> {
    return this.fetchJson<ApiResponse>('/api/backups/notes', {
      method: 'PUT',
      body: JSON.stringify({ backup_name: backupName, notes, tags }),
    });
  }

  /**
   * Manually verifies the integrity of a backup archive.
   * Tests that the tar.gz file is readable, counts files, and saves verification result.
   *
   * @param {string} backupName - Name of the backup to verify
   * @returns {Promise<ApiResponse & { verification: { status: string; file_count: number; verification_time: number; error?: string } }>} Verification result
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async verifyBackup(
    backupName: string
  ): Promise<
    ApiResponse & {
      verification: {
        status: 'verified' | 'failed' | 'pending' | 'unknown';
        file_count: number;
        verification_time: number;
        error?: string;
      };
    }
  > {
    return this.fetchJson<
      ApiResponse & {
        verification: {
          status: 'verified' | 'failed' | 'pending' | 'unknown';
          file_count: number;
          verification_time: number;
          error?: string;
        };
      }
    >(`/api/backups/${encodeURIComponent(backupName)}/verify`, {
      method: 'POST',
    });
  }

  /**
   * Deletes a specific backup archive.
   * This operation is permanent and cannot be undone.
   *
   * @param {string} backupName - Name of the backup to delete
   * @returns {Promise<ApiResponse>} Success confirmation
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async deleteBackup(backupName: string): Promise<ApiResponse> {
    return this.fetchJson<ApiResponse>('/api/delete', {
      method: 'POST',
      body: JSON.stringify({ backup_name: backupName }),
    });
  }

  /**
   * Downloads a specific backup archive to the user's local machine.
   * Triggers browser download by creating a temporary anchor element.
   *
   * @param {string} backupName - Name of the backup to download
   * @throws {Error} When download fails or backup not found
   * @async
   */
  async downloadBackup(backupName: string): Promise<void> {
    const downloadUrl = `/api/download/${encodeURIComponent(backupName)}`;

    // Create temporary anchor element to trigger download
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = backupName;
    downloadLink.style.display = 'none';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  /**
   * Restores a backup archive to the ARK server with progress tracking via SSE.
   * WARNING: This replaces all current save files with backup data.
   * Server must be stopped before restoration to prevent corruption.
   *
   * @param {string} backupName - Name of the backup to restore
   * @param {(event: { stage: string; percent: number; message?: string }) => void} onProgress - Progress callback
   * @returns {Promise<void>} Resolves when restore completes
   * @throws {Error} When restore fails or backup not found
   * @async
   */
  async restoreBackup(
    backupName: string,
    onProgress: (event: { stage: string; percent: number; message?: string }) => void
  ): Promise<void> {
    return new Promise((resolvePromise, rejectPromise) => {
      fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_name: backupName }),
      })
        .then((httpResponse) => {
          if (!httpResponse.ok) {
            throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
          }

          const reader = httpResponse.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('Response body is not readable');
          }

          /**
           * Reads SSE stream chunks and processes events.
           */
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
                        resolvePromise();
                        return;
                      } else if (eventType === 'error') {
                        rejectPromise(new Error(eventData.error || 'Restore failed'));
                        return;
                      }
                    }
                  }
                }

                readStream();
              })
              .catch((streamError) => {
                rejectPromise(streamError);
              });
          };

          readStream();
        })
        .catch((fetchError) => {
          rejectPromise(fetchError);
        });
    });
  }

  /**
   * Connects to the server status SSE stream for real-time updates.
   * Returns an EventSource that emits status change events.
   *
   * @param {(status: string) => void} onStatus - Callback for status updates
   * @param {(error: string) => void} onError - Callback for errors
   * @returns {EventSource} EventSource instance for managing the connection
   */
  connectServerStatusStream(
    onStatus: (status: string) => void,
    onError: (error: string) => void
  ): EventSource {
    const eventSource = new EventSource('/api/server/status/stream');

    eventSource.addEventListener('connected', () => {
      console.log('Server status stream connected');
    });

    eventSource.addEventListener('status', (messageEvent) => {
      const eventData = JSON.parse(messageEvent.data);
      if (eventData.ok && eventData.status) {
        onStatus(eventData.status);
      }
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const eventData = JSON.parse((messageEvent as MessageEvent).data);
      onError(eventData.error || 'Unknown error');
    });

    eventSource.onerror = () => {
      console.error('Server status stream connection error');
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Connects to the backups list SSE stream for real-time updates.
   * Returns an EventSource that emits backups list change events.
   *
   * @param {(backups: BackupMetadata[]) => void} onBackups - Callback for backups list updates
   * @param {(error: string) => void} onError - Callback for errors
   * @returns {EventSource} EventSource instance for managing the connection
   */
  connectBackupsStream(
    onBackups: (backups: BackupMetadata[]) => void,
    onError: (error: string) => void
  ): EventSource {
    const eventSource = new EventSource('/api/backups/stream');

    eventSource.addEventListener('connected', () => {
      console.log('Backups stream connected');
    });

    eventSource.addEventListener('backups', (messageEvent) => {
      const backupsData = JSON.parse(messageEvent.data);
      onBackups(backupsData);
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const eventData = JSON.parse((messageEvent as MessageEvent).data);
      onError(eventData.error || 'Unknown error');
    });

    eventSource.onerror = () => {
      console.error('Backups stream connection error');
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Connects to the backup health SSE stream for real-time updates.
   * Returns an EventSource that emits backup health status change events.
   *
   * @param {(health: BackupHealthStatus) => void} onHealth - Callback for health status updates
   * @param {(error: string) => void} onError - Callback for errors
   * @returns {EventSource} EventSource instance for managing the connection
   */
  connectBackupHealthStream(
    onHealth: (health: BackupHealthStatus) => void,
    onError: (error: string) => void
  ): EventSource {
    const eventSource = new EventSource('/api/backup/health/stream');

    eventSource.addEventListener('connected', () => {
      console.log('Backup health stream connected');
    });

    eventSource.addEventListener('health', (messageEvent) => {
      const healthData = JSON.parse(messageEvent.data);
      onHealth(healthData);
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const eventData = JSON.parse((messageEvent as MessageEvent).data);
      onError(eventData.error || 'Unknown error');
    });

    eventSource.onerror = () => {
      console.error('Backup health stream connection error');
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Connects to the disk space SSE stream for real-time updates.
   * Returns an EventSource that emits disk space change events.
   *
   * @param {(diskSpace: DiskSpace) => void} onDiskSpace - Callback for disk space updates
   * @param {(error: string) => void} onError - Callback for errors
   * @returns {EventSource} EventSource instance for managing the connection
   */
  connectDiskSpaceStream(
    onDiskSpace: (diskSpace: DiskSpace) => void,
    onError: (error: string) => void
  ): EventSource {
    const eventSource = new EventSource('/api/disk-space/stream');

    eventSource.addEventListener('connected', () => {
      console.log('Disk space stream connected');
    });

    eventSource.addEventListener('diskspace', (messageEvent) => {
      const diskSpaceData = JSON.parse(messageEvent.data);
      onDiskSpace(diskSpaceData);
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const eventData = JSON.parse((messageEvent as MessageEvent).data);
      onError(eventData.error || 'Unknown error');
    });

    eventSource.onerror = () => {
      console.error('Disk space stream connection error');
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * Fetches current ARK server status.
   *
   * @returns {Promise<ServerStatus>} Server state (running/stopped) with metadata
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async getServerStatus(): Promise<ServerStatus> {
    return this.fetchJson<ServerStatus>('/api/server/status');
  }

  /**
   * Starts the ARK dedicated server.
   *
   * @returns {Promise<ServerStatus>} Updated server status after start command
   * @throws {Error} When request fails, server is already running, or server returns error
   * @async
   */
  async startServer(): Promise<ServerStatus> {
    return this.fetchJson<ServerStatus>('/api/server/start', {
      method: 'POST',
    });
  }

  /**
   * Stops the ARK dedicated server.
   * WARNING: This disconnects all connected players.
   *
   * @returns {Promise<ServerStatus>} Updated server status after stop command
   * @throws {Error} When request fails, server is already stopped, or server returns error
   * @async
   */
  async stopServer(): Promise<ServerStatus> {
    return this.fetchJson<ServerStatus>('/api/server/stop', {
      method: 'POST',
    });
  }

  /**
   * Fetches disk space information for the backup storage directory.
   * Returns total, used, available capacity and usage percentage.
   *
   * @returns {Promise<DiskSpace>} Disk space statistics in bytes
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async getDiskSpace(): Promise<DiskSpace> {
    return this.fetchJson<DiskSpace>('/api/disk-space');
  }

  /**
   * Fetches backup system health status.
   * Returns scheduler activity status and backup success/failure information.
   *
   * @returns {Promise<BackupHealthStatus>} Backup system health status
   * @throws {Error} When request fails or server returns error
   * @async
   */
  async getBackupHealth(): Promise<BackupHealthStatus> {
    return this.fetchJson<BackupHealthStatus>('/api/backup/health');
  }
}

/**
 * Singleton API service instance for application-wide use.
 * Import this constant to access all API methods.
 *
 * @example
 * import { api } from './services/api';
 * const backups = await api.getBackups();
 */
export const api = new ApiService();
