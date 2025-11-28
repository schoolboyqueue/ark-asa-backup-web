/**
 * @fileoverview Settings repository for backup configuration.
 * Manages backup settings state and provides CRUD operations.
 *
 * Clean Architecture: Repository Layer
 * - Encapsulates "where settings live" and "how we access them"
 * - Manages local state for settings
 * - Provides stable, intention-revealing API in domain language
 */

import { useState, useEffect, useCallback } from 'react';
import { serverApiAdapter } from '../adapters/serverApiAdapter';
import type { BackupSettings } from '../domain/server';

/**
 * Return type for useSettingsRepository.
 */
export interface UseSettingsRepositoryReturn {
  /** Current backup settings or null if not yet loaded */
  settings: BackupSettings | null;

  /** Whether initial settings load is in progress */
  isLoading: boolean;

  /** Error message if failed to load settings */
  error: string | null;

  /** Manually refresh settings from server */
  refreshSettings: () => Promise<void>;

  /** Update local settings state (after successful save) */
  updateLocalSettings: (newSettings: BackupSettings) => void;
}

/**
 * Repository hook for backup settings.
 * Fetches settings on mount and provides operations for managing settings state.
 *
 * Design Pattern: Repository
 * - Single source of truth for settings data
 * - Abstracts data access from components
 * - Provides clear API for settings operations
 *
 * @returns {UseSettingsRepositoryReturn} Settings state and operations
 */
export function useSettingsRepository(): UseSettingsRepositoryReturn {
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads settings from the server.
   * Called on mount and can be manually triggered via refreshSettings.
   *
   * @async
   */
  const loadSettings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const settingsData = await serverApiAdapter.getSettings();
      setSettings(settingsData);
    } catch (loadError) {
      const errorMessage =
        loadError instanceof Error ? loadError.message : 'Failed to load settings';
      console.error('[SettingsRepository] Failed to load settings:', loadError);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refreshes settings from server.
   * Can be called manually to reload settings.
   *
   * @async
   */
  const refreshSettings = useCallback(async (): Promise<void> => {
    await loadSettings();
  }, [loadSettings]);

  /**
   * Updates local settings state.
   * Should be called after successful settings update to keep state in sync.
   *
   * @param {BackupSettings} newSettings - The updated settings
   */
  const updateLocalSettings = useCallback((newSettings: BackupSettings): void => {
    setSettings(newSettings);
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    refreshSettings,
    updateLocalSettings,
  };
}
