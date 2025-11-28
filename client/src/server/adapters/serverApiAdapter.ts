/**
 * @fileoverview Server API adapter for HTTP operations.
 * Handles server control and settings API calls.
 *
 * Clean Architecture: Adapter Layer
 * - Transforms backend API responses to domain models
 * - Handles HTTP communication with backend
 * - Isolates domain from API implementation details
 */

import type { Server, BackupSettings, UpdateSettingsDto } from '../domain/server';

/**
 * Backend API response envelope.
 * Standard response wrapper from backend API.
 */
interface ApiResponse {
  ok: boolean;
  error?: string;
}

/**
 * Backend server status API response.
 * Represents the raw API contract from /api/server/status endpoint.
 */
interface ServerStatusApi {
  ok: boolean;
  status: string;
  error?: string;
}

/**
 * Backend settings API response.
 * Represents the raw API contract with SCREAMING_SNAKE_CASE from backend.
 */
interface BackupSettingsApi {
  BACKUP_INTERVAL: number;
  MAX_BACKUPS: number;
  AUTO_SAFETY_BACKUP?: boolean;
}

/**
 * Transforms API server status to domain model.
 */
function transformApiServerToDomain(api: ServerStatusApi): Server {
  const status = api.status as Server['status'];
  return {
    status,
    isRunning: status === 'running',
  };
}

/**
 * Transforms API settings to domain model.
 */
function transformApiSettingsToDomain(api: BackupSettingsApi): BackupSettings {
  return {
    backupIntervalSeconds: api.BACKUP_INTERVAL,
    maxBackupsToKeep: api.MAX_BACKUPS,
    autoSafetyBackup: api.AUTO_SAFETY_BACKUP !== false,
  };
}

/**
 * Transforms domain settings to API format.
 */
function transformDomainSettingsToApi(settings: UpdateSettingsDto): BackupSettingsApi {
  return {
    BACKUP_INTERVAL: settings.backupIntervalSeconds,
    MAX_BACKUPS: settings.maxBackupsToKeep,
    AUTO_SAFETY_BACKUP: settings.autoSafetyBackup,
  };
}

/**
 * Server API adapter.
 */
export const serverApiAdapter = {
  /**
   * Fetches current server status.
   */
  async getServerStatus(): Promise<Server> {
    const response = await fetch('/api/server/status');
    if (!response.ok) {
      throw new Error(`Failed to fetch server status: HTTP ${response.status}`);
    }

    const result: ServerStatusApi = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Failed to fetch server status');
    }

    return transformApiServerToDomain(result);
  },

  /**
   * Starts the ARK server.
   */
  async startServer(): Promise<Server> {
    const response = await fetch('/api/server/start', { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to start server: HTTP ${response.status}`);
    }

    const result: ServerStatusApi = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Failed to start server');
    }

    return transformApiServerToDomain(result);
  },

  /**
   * Stops the ARK server.
   */
  async stopServer(): Promise<Server> {
    const response = await fetch('/api/server/stop', { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Failed to stop server: HTTP ${response.status}`);
    }

    const result: ServerStatusApi = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Failed to stop server');
    }

    return transformApiServerToDomain(result);
  },

  /**
   * Fetches current backup settings.
   */
  async getSettings(): Promise<BackupSettings> {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: HTTP ${response.status}`);
    }

    const result: BackupSettingsApi = await response.json();
    return transformApiSettingsToDomain(result);
  },

  /**
   * Updates backup settings.
   */
  async updateSettings(settings: UpdateSettingsDto): Promise<BackupSettings> {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformDomainSettingsToApi(settings)),
    });

    if (!response.ok) {
      throw new Error(`Failed to update settings: HTTP ${response.status}`);
    }

    const result: ApiResponse & { settings?: BackupSettingsApi } = await response.json();
    if (!result.ok) {
      throw new Error(result.error || 'Failed to update settings');
    }

    if (!result.settings) {
      throw new Error('Server did not return updated settings');
    }

    return transformApiSettingsToDomain(result.settings);
  },
};
