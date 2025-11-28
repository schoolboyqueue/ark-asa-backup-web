/**
 * @fileoverview Header controls component with consolidated status and controls.
 * Provides compact system status monitoring and theme switcher in the application header.
 *
 * Clean Architecture: View Layer (Composition)
 * - Composes domain UI components (SystemStatus, ServerControls)
 * - Manages theme switcher (global concern)
 * - Pure presentation - no business logic
 */

import { Button, ButtonGroup } from '@heroui/react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/solid';

// Clean Architecture imports - organized by domain
import SystemStatus from '../../system/ui/SystemStatus';
import ServerControls from '../../server/ui/ServerControls';
import type { DiskSpace, BackupHealth } from '../../system/domain/system';
import type { Server } from '../../server/domain/server';

/**
 * Props interface for the HeaderControls component.
 * @interface HeaderControlsProps
 */
interface HeaderControlsProps {
  /** Current server status or null if not yet loaded */
  serverStatus: Server | null;
  /** Whether the component is currently loading server data */
  serverLoading: boolean;
  /** Disk space information or null if not yet loaded */
  diskSpace: DiskSpace | null;
  /** Backup health status or null if not yet loaded */
  backupHealth: BackupHealth | null;
  /** Current theme mode */
  themeMode: 'light' | 'dark' | 'system';
  /** Callback to handle theme change */
  onThemeChange: (mode: 'light' | 'dark' | 'system') => void;
}

/**
 * Header controls component with consolidated monitoring and controls.
 * Features:
 * - System Status button with aggregate health indicator
 * - Server Controls button with start/stop and settings
 * - Theme switcher button group (3 buttons)
 *
 * Design Patterns:
 * - Composition: Delegates to specialized components
 * - Single Responsibility: Each sub-component handles one concern
 *
 * @param {HeaderControlsProps} props - Component props
 * @returns {JSX.Element} Header controls section
 */
export default function HeaderControls({
  serverStatus,
  serverLoading,
  diskSpace,
  backupHealth,
  themeMode,
  onThemeChange,
}: HeaderControlsProps): JSX.Element {
  /**
   * Theme icons for the theme switcher.
   */
  const themeIcons = {
    light: <SunIcon className="h-5 w-5" />,
    dark: <MoonIcon className="h-5 w-5" />,
    system: <ComputerDesktopIcon className="h-5 w-5" />,
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* System Status - Consolidated monitoring dashboard */}
      <SystemStatus
        serverStatus={serverStatus}
        diskSpace={diskSpace}
        backupHealth={backupHealth}
        loading={serverLoading}
      />

      {/* Server Controls - Consolidated server management and settings */}
      <ServerControls serverStatus={serverStatus} />

      {/* Theme Switcher - Keep existing 3-button group */}
      <ButtonGroup size="sm" variant="flat">
        <Button
          isIconOnly
          color={themeMode === 'light' ? 'primary' : 'default'}
          onPress={() => onThemeChange('light')}
          aria-label="Light theme"
        >
          {themeIcons.light}
        </Button>
        <Button
          isIconOnly
          color={themeMode === 'dark' ? 'primary' : 'default'}
          onPress={() => onThemeChange('dark')}
          aria-label="Dark theme"
        >
          {themeIcons.dark}
        </Button>
        <Button
          isIconOnly
          color={themeMode === 'system' ? 'primary' : 'default'}
          onPress={() => onThemeChange('system')}
          aria-label="System theme"
        >
          {themeIcons.system}
        </Button>
      </ButtonGroup>
    </div>
  );
}
