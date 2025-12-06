/**
 * @fileoverview System Status component for consolidated monitoring dashboard.
 * Displays aggregate health status with detailed popover containing all system metrics.
 *
 * Clean Architecture: View Layer
 * - Pure presentation component
 * - Receives domain models as props
 * - No business logic
 */

import { useState } from 'react';
import { Button, Popover, PopoverTrigger, PopoverContent, Progress, Chip } from '@heroui/react';
import {
  ChartBarIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';
// Clean Architecture: Domain type imports
import type { DiskSpace, BackupHealth, VersionInfo } from '../domain/system';
import type { Server } from '../../server/domain/server';
import { formatRelativeTime } from '../../backups';

/** Client version injected by Vite at build time */
const CLIENT_VERSION = __APP_VERSION__;

/**
 * Props interface for the SystemStatus component.
 * @interface SystemStatusProps
 */
interface SystemStatusProps {
  /** Current server status or null if not yet loaded */
  serverStatus: Server | null;
  /** Disk space information or null if not yet loaded */
  diskSpace: DiskSpace | null;
  /** Backup health status or null if not yet loaded */
  backupHealth: BackupHealth | null;
  /** Server version information or null if not yet loaded */
  versionInfo: VersionInfo | null;
  /** Whether the component is currently loading data */
  loading: boolean;
}

/**
 * Determines the color for disk space usage indicator.
 * @param {number} usedPercent - Disk usage percentage
 * @returns {'danger' | 'warning' | 'success'} Color based on usage level
 */
function getDiskSpaceColor(usedPercent: number): 'danger' | 'warning' | 'success' {
  if (usedPercent > 90) return 'danger';
  if (usedPercent > 75) return 'warning';
  return 'success';
}

/**
 * Determines the CSS class for the health indicator ping animation.
 * @param {string} healthColor - The health status color
 * @returns {string} CSS class for the ping animation
 */
function getHealthPingClass(healthColor: string): string {
  if (healthColor === 'danger') return 'bg-danger animate-ping-danger';
  if (healthColor === 'warning') return 'bg-warning animate-ping-warning';
  return 'bg-success animate-ping-success';
}

/**
 * Determines the CSS class for the health indicator dot.
 * @param {string} healthColor - The health status color
 * @returns {string} CSS class for the health dot
 */
function getHealthDotClass(healthColor: string): string {
  if (healthColor === 'danger') return 'bg-danger';
  if (healthColor === 'warning') return 'bg-warning';
  return 'bg-success';
}

/**
 * System status component with consolidated health monitoring.
 * Shows aggregate status indicator with detailed popover.
 *
 * Health indicator colors:
 * - Red: Critical (server stopped OR scheduler inactive OR disk >90%)
 * - Yellow: Warning (disk 75-90%)
 * - Green: Healthy (all systems operational)
 *
 * @param {SystemStatusProps} props - Component props
 * @returns {JSX.Element} System status button with popover
 */
export default function SystemStatus({
  serverStatus,
  diskSpace,
  backupHealth,
  versionInfo,
  loading,
}: Readonly<SystemStatusProps>): JSX.Element {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  /**
   * Determines the aggregate health status color.
   * Red takes priority over yellow, yellow over green.
   *
   * @returns {'danger' | 'warning' | 'success'} Health status color
   */
  const getHealthColor = (): 'danger' | 'warning' | 'success' => {
    // Critical conditions (red) - server stopped or dead
    if (['exited', 'dead', 'paused'].includes(serverStatus?.status ?? '')) return 'danger';
    if (backupHealth && !backupHealth.schedulerActive) return 'danger';
    if (diskSpace && diskSpace.usedPercent > 90) return 'danger';

    // Warning conditions (yellow) - transitional states or high disk usage
    if (serverStatus?.isTransitioning) return 'warning';
    if (diskSpace && diskSpace.usedPercent > 75) return 'warning';

    // All healthy (green)
    return 'success';
  };

  /**
   * Renders the server status badge.
   */
  const renderServerStatus = (): JSX.Element => {
    if (loading || serverStatus === null) {
      return (
        <div className="animate-pulse">
          <Chip color="primary" variant="flat" size="sm">
            Loading...
          </Chip>
        </div>
      );
    }

    switch (serverStatus.status) {
      case 'running':
        return (
          <Chip
            color="success"
            variant="flat"
            size="sm"
            startContent={<RocketLaunchIcon className="h-4 w-4" />}
          >
            Running
          </Chip>
        );

      case 'starting':
        return (
          <div className="animate-pulse">
            <Chip color="warning" variant="flat" size="sm" className="font-semibold">
              Starting...
            </Chip>
          </div>
        );

      case 'stopping':
        return (
          <div className="animate-pulse">
            <Chip color="warning" variant="flat" size="sm" className="font-semibold">
              Stopping...
            </Chip>
          </div>
        );

      case 'restarting':
        return (
          <div className="animate-pulse">
            <Chip color="warning" variant="flat" size="sm" className="font-semibold">
              Restarting...
            </Chip>
          </div>
        );

      case 'exited':
        return (
          <Chip color="default" variant="flat" size="sm" className="opacity-60">
            Stopped
          </Chip>
        );

      default:
        return (
          <Chip color="default" variant="flat" size="sm" className="opacity-60">
            {serverStatus.status}
          </Chip>
        );
    }
  };

  const healthColor = getHealthColor();

  const popoverContent = (
    <div className="w-80 space-y-4 p-4">
      <h3 className="text-sm font-semibold">System Status</h3>

      {/* Server Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-default-500">ARK Server</span>
          {renderServerStatus()}
        </div>
      </div>

      {/* Backup Health */}
      {backupHealth && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-default-500">Backup Scheduler</span>
            {backupHealth.schedulerActive ? (
              <Chip
                size="sm"
                variant="flat"
                color="success"
                startContent={<CheckCircleIcon className="h-3 w-3" />}
              >
                Active
              </Chip>
            ) : (
              <Chip
                size="sm"
                variant="flat"
                color="danger"
                startContent={<ExclamationCircleIcon className="h-3 w-3" />}
              >
                Inactive
              </Chip>
            )}
          </div>
          {backupHealth.lastSuccessfulBackup && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-default-500">Last Backup</span>
              <Chip
                size="sm"
                variant="flat"
                color="default"
                startContent={<ClockIcon className="h-3 w-3" />}
              >
                {formatRelativeTime(backupHealth.lastSuccessfulBackup)}
              </Chip>
            </div>
          )}
          {backupHealth.lastError && (
            <div className="rounded bg-danger-50 p-2 dark:bg-danger-900/20">
              <p className="text-xs text-danger" title={backupHealth.lastError}>
                Error: {backupHealth.lastError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Disk Space */}
      {diskSpace && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-default-500">Storage</span>
          <div className="flex items-center gap-2">
            <Progress
              size="md"
              value={diskSpace.usedPercent}
              color={getDiskSpaceColor(diskSpace.usedPercent)}
              className="flex-1"
              aria-label="Disk space usage"
            />
            <Chip size="sm" variant="flat" color={getDiskSpaceColor(diskSpace.usedPercent)}>
              {diskSpace.usedPercent}%
            </Chip>
          </div>
        </div>
      )}

      {/* Version Information */}
      <div className="space-y-2 border-t border-divider pt-3">
        <span className="text-xs font-semibold text-default-500">Version</span>
        <div className="flex items-center justify-between">
          <span className="text-xs text-default-400">Client</span>
          <span className="text-xs font-mono text-default-600">v{CLIENT_VERSION}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-default-400">Server</span>
          <span className="text-xs font-mono text-default-600">
            {versionInfo ? `v${versionInfo.serverVersion}` : '...'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Popover isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen} placement="bottom">
      <PopoverTrigger>
        <Button variant="flat" className="relative">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">System Status</span>
            {/* Health indicator dot with ping/radar pulse animation */}
            <div className="relative flex h-2 w-2 items-center justify-center">
              {/* Outer ping ring */}
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${getHealthPingClass(healthColor)}`}
                style={{ animationIterationCount: 'infinite' }}
              />
              {/* Solid center dot */}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${getHealthDotClass(healthColor)}`}
                aria-label={`System health: ${healthColor}`}
              />
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent>{popoverContent}</PopoverContent>
    </Popover>
  );
}
