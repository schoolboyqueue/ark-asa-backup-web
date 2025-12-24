/**
 * @fileoverview Main application component for ARK ASA Backup Manager.
 * Implements the primary UI layout with theme support, server control, backup settings,
 * and backup list management.
 *
 * Clean Architecture: View Layer (Top-level composition)
 * - Composes UI from domain-specific components
 * - Manages global concerns (theme, layout)
 * - Delegates domain logic to repositories and UseCases
 */

import { CircleStackIcon } from '@heroicons/react/24/solid';
import { Alert, HeroUIProvider, ToastProvider } from '@heroui/react';
import { useEffect, useState } from 'react';
import BackupsList from './backups/ui/BackupsList';
// Clean Architecture imports - organized by domain
import { useServerRepository } from './server/repository/useServerRepository';
import HeaderControls from './shared/ui/HeaderControls';
import { useSystemRepository } from './system/repository/useSystemRepository';

import './App.css';

/**
 * Supported theme modes for the application.
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
 *
 * Clean Architecture: View Layer (Composition)
 * - Uses repositories for all domain data
 * - No manual SSE setup (handled by repositories)
 * - No manual state management for domain data
 */
function AppContent({
  themeMode,
  onThemeChange,
}: Readonly<{
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}>): JSX.Element {
  // Clean Architecture: Domain data from repositories
  const serverRepo = useServerRepository();
  const systemRepo = useSystemRepository();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-divider bg-content1">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <CircleStackIcon
              className="h-6 w-6 shrink-0 sm:h-8 sm:w-8"
              style={{ color: PRIMARY_COLOR }}
            />
            <div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: PRIMARY_COLOR }}>
                ARK ASA Backup Manager
              </h1>
              <p className="text-xs text-default-500">Automated backup system with safe restore</p>
            </div>
          </div>

          <HeaderControls
            serverStatus={serverRepo.server}
            serverLoading={serverRepo.isLoading}
            diskSpace={systemRepo.diskSpace}
            backupHealth={systemRepo.backupHealth}
            versionInfo={systemRepo.versionInfo}
            themeMode={themeMode}
            onThemeChange={onThemeChange}
          />
        </div>
      </header>

      {/* Warning banner area */}
      {serverRepo.server?.status === 'running' && (
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
          <BackupsList serverStatus={serverRepo.server} />
        </div>
      </main>
    </div>
  );
}

/**
 * Main application component that orchestrates the ARK ASA Backup Manager UI.
 * Manages global concerns (theme, HeroUI provider) and delegates domain logic to Clean Architecture.
 *
 * Clean Architecture: View Layer (Application Root)
 * - Provides global providers (HeroUI, Toast)
 * - Manages theme preferences (light/dark/system)
 * - Delegates domain state to repositories
 * - No business logic - pure composition
 *
 * Design Patterns:
 * - Strategy: Theme selection strategy (light/dark/system)
 * - Provider: Global UI and toast providers
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
      return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
