/**
 * @fileoverview Main application component for ARK ASA Backup Manager.
 * Implements the primary UI layout with theme support, server control, backup settings,
 * and backup list management. Follows single responsibility principle with separate
 * components for each concern.
 */

import { useState, useEffect } from 'react';
import { HeroUIProvider, Alert, ToastProvider } from '@heroui/react';
import { CircleStackIcon } from '@heroicons/react/24/solid';
import HeaderControls from './components/HeaderControls';
import BackupsList from './components/BackupsList';
import type {
  BackupMetadata,
  BackupSettings as IBackupSettings,
  ServerStatus,
  DiskSpace,
  BackupHealthStatus,
} from './types';
import { api } from './services/api';
import './App.css';

/**
 * Supported theme modes for the application.
 * @typedef {'light' | 'dark' | 'system'} ThemeMode
 */
type ThemeMode = 'light' | 'dark' | 'system';

/** Local storage key for theme preference */
const THEME_STORAGE_KEY = 'themeMode';

/** Default theme mode */
const DEFAULT_THEME_MODE: ThemeMode = 'dark';

/** Primary brand color for the application */
const PRIMARY_COLOR = '#0ea5e9';

/**
 * Inner content component that has access to theme context.
 * Must be rendered inside HeroUIProvider to access theme properly.
 */
function AppContent({
  themeMode,
  onThemeChange,
}: {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}): JSX.Element {
  // State management with descriptive names
  const [backupsList, setBackupsList] = useState<BackupMetadata[]>([]);
  const [backupSettings, setBackupSettings] = useState<IBackupSettings | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [diskSpace, setDiskSpace] = useState<DiskSpace | null>(null);
  const [backupHealth, setBackupHealth] = useState<BackupHealthStatus | null>(null);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState<boolean>(true);

  /**
   * Effect hook to load initial data and set up Server-Sent Events for real-time updates.
   * Uses SSE streams for server status, backups list, backup health, and disk space.
   * No polling needed - all updates are pushed from server in real-time.
   * Cleans up SSE connections on component unmount.
   */
  useEffect(() => {
    loadInitialData();

    // Set up SSE for server status updates
    const statusEventSource = api.connectServerStatusStream(
      (newStatus: string) => {
        setServerStatus({
          ok: true,
          status: newStatus as
            | 'running'
            | 'exited'
            | 'paused'
            | 'restarting'
            | 'removing'
            | 'dead'
            | 'created',
        });
      },
      (errorMessage: string) => {
        console.error('Server status stream error:', errorMessage);
      }
    );

    // Set up SSE for backups list updates
    const backupsEventSource = api.connectBackupsStream(
      (newBackups: BackupMetadata[]) => {
        setBackupsList(newBackups);
      },
      (errorMessage: string) => {
        console.error('Backups stream error:', errorMessage);
      }
    );

    // Set up SSE for backup health updates
    const healthEventSource = api.connectBackupHealthStream(
      (newHealth: BackupHealthStatus) => {
        setBackupHealth(newHealth);
      },
      (errorMessage: string) => {
        console.error('Backup health stream error:', errorMessage);
      }
    );

    // Set up SSE for disk space updates
    const diskSpaceEventSource = api.connectDiskSpaceStream(
      (newDiskSpace: DiskSpace) => {
        setDiskSpace(newDiskSpace);
      },
      (errorMessage: string) => {
        console.error('Disk space stream error:', errorMessage);
      }
    );

    return () => {
      statusEventSource.close();
      backupsEventSource.close();
      healthEventSource.close();
      diskSpaceEventSource.close();
    };
  }, []);

  /**
   * Loads all initial application data in parallel.
   * Sets loading state to true during fetch, false after completion.
   *
   * @async
   */
  const loadInitialData = async (): Promise<void> => {
    setIsLoadingInitialData(true);
    try {
      await Promise.all([
        loadBackupSettings(),
        loadBackupsList(),
        loadServerStatus(),
        loadDiskSpace(),
        loadBackupHealth(),
      ]);
    } finally {
      setIsLoadingInitialData(false);
    }
  };

  /**
   * Fetches backup settings from the API and updates state.
   * Errors are logged but do not prevent other data from loading.
   *
   * @async
   */
  const loadBackupSettings = async (): Promise<void> => {
    try {
      const settingsData = await api.getSettings();
      setBackupSettings(settingsData);
    } catch (error) {
      console.error('Failed to load backup settings:', error);
    }
  };

  /**
   * Fetches the list of available backups from the API and updates state.
   * Errors are logged but do not prevent other data from loading.
   *
   * @async
   */
  const loadBackupsList = async (): Promise<void> => {
    try {
      const backupsData = await api.getBackups();
      setBackupsList(backupsData);
    } catch (error) {
      console.error('Failed to load backups list:', error);
    }
  };

  /**
   * Fetches the current ARK server status from the API and updates state.
   * Errors are logged but do not prevent other data from loading.
   *
   * @async
   */
  const loadServerStatus = async (): Promise<void> => {
    try {
      const statusData = await api.getServerStatus();
      setServerStatus(statusData);
    } catch (error) {
      console.error('Failed to load server status:', error);
    }
  };

  /**
   * Fetches disk space information from the API and updates state.
   * Errors are logged but do not prevent other data from loading.
   *
   * @async
   */
  const loadDiskSpace = async (): Promise<void> => {
    try {
      const diskSpaceData = await api.getDiskSpace();
      setDiskSpace(diskSpaceData);
    } catch (error) {
      console.error('Failed to load disk space:', error);
    }
  };

  /**
   * Fetches backup system health status from the API and updates state.
   * Errors are logged but do not prevent other data from loading.
   *
   * @async
   */
  const loadBackupHealth = async (): Promise<void> => {
    try {
      const healthData = await api.getBackupHealth();
      setBackupHealth(healthData);
    } catch (error) {
      console.error('Failed to load backup health:', error);
    }
  };

  /**
   * Handles backup settings update from the BackupSettings component.
   * Updates settings via API, then refreshes local state and backups list.
   *
   * @param {IBackupSettings} newSettings - The new backup settings to apply
   * @throws {Error} Re-throws API errors to be handled by the component
   * @async
   */
  const handleSettingsUpdate = async (newSettings: IBackupSettings): Promise<void> => {
    try {
      await api.updateSettings(newSettings);
      setBackupSettings(newSettings);
      loadBackupsList();
    } catch (error) {
      console.error('Failed to update backup settings:', error);
      throw error;
    }
  };

  /**
   * Handles backup deletion request from the BackupsList component.
   * Deletes backup via API, then refreshes the backups list.
   *
   * @param {string} backupName - The name of the backup to delete
   * @throws {Error} Re-throws API errors to be handled by the component
   * @async
   */
  const handleBackupDelete = async (backupName: string): Promise<void> => {
    try {
      await api.deleteBackup(backupName);
      loadBackupsList();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  };

  /**
   * Handles backup restore completion callback from the BackupsList component.
   * BackupsList handles the actual restore operation with progress tracking internally.
   * This callback is invoked after restore completes to refresh parent state.
   *
   * @async
   */
  const handleBackupRestore = async (_backupName: string): Promise<void> => {
    await loadBackupsList();
    await loadServerStatus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-divider bg-content1">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <CircleStackIcon className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8" style={{ color: PRIMARY_COLOR }} />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: PRIMARY_COLOR }}>
                ARK ASA Backup Manager
              </h1>
              <p className="text-xs text-default-500">Automated backup system with safe restore</p>
            </div>
          </div>

          <HeaderControls
            serverStatus={serverStatus}
            serverLoading={isLoadingInitialData}
            settings={backupSettings}
            diskSpace={diskSpace}
            backupHealth={backupHealth}
            onSettingsUpdate={handleSettingsUpdate}
            onServerRefresh={loadServerStatus}
            themeMode={themeMode}
            onThemeChange={onThemeChange}
          />
        </div>
      </header>

      {/* Warning banner area */}
      {serverStatus?.status === 'running' && (
        <div className="px-4 py-3 sm:px-6">
          <Alert
            color="warning"
            variant="faded"
            title="Server is Running"
            description="Stop the ARK server before restoring a backup to prevent data corruption"
          />
        </div>
      )}

      {/* Main Content */}
      <main className="bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">
          <BackupsList
            backups={backupsList}
            serverStatus={serverStatus}
            loading={isLoadingInitialData}
            onDelete={handleBackupDelete}
            onRestore={handleBackupRestore}
          />
        </div>
      </main>
    </div>
  );
}

/**
 * Main application component that orchestrates the ARK ASA Backup Manager UI.
 * Manages global state for backups, settings, server status, and theme preferences.
 *
 * Design Patterns:
 * - Container/Presentational: App acts as a smart container, delegating to dumb components
 * - Observer: Uses polling to observe server state changes
 * - Strategy: Theme selection strategy (light/dark/system)
 *
 * @returns {JSX.Element} The main application layout
 */
function App(): JSX.Element {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedThemeMode = localStorage.getItem(THEME_STORAGE_KEY);
    return (savedThemeMode as ThemeMode) || DEFAULT_THEME_MODE;
  });

  /**
   * Determines the actual theme to apply based on the selected theme mode.
   * When 'system' is selected, it respects the OS-level dark mode preference.
   *
   * @returns {'light' | 'dark'} The resolved theme to apply
   */
  const getActualTheme = (): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeMode;
  };

  const actualTheme = getActualTheme();

  /**
   * Handles theme mode change from the theme dropdown menu.
   * Updates local state and persists preference to localStorage.
   *
   * @param {ThemeMode} newThemeMode - The new theme mode to apply
   */
  const handleThemeChange = (newThemeMode: ThemeMode): void => {
    setThemeMode(newThemeMode);
    localStorage.setItem(THEME_STORAGE_KEY, newThemeMode);
  };

  // Apply theme class to html element for Hero UI
  useEffect(() => {
    const rootElement = document.documentElement;
    if (actualTheme === 'dark') {
      rootElement.classList.add('dark');
    } else {
      rootElement.classList.remove('dark');
    }
  }, [actualTheme]);

  return (
    <HeroUIProvider>
      <ToastProvider placement="top-right" maxVisibleToasts={3} />
      <AppContent themeMode={themeMode} onThemeChange={handleThemeChange} />
    </HeroUIProvider>
  );
}

export default App;
