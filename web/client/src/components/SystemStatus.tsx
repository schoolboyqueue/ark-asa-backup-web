/**
 * @fileoverview System Status component for consolidated monitoring dashboard.
 * Displays aggregate health status with detailed popover containing all system metrics.
 */

import { useState } from 'react';
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Progress,
  Chip,
} from '@heroui/react';
import {
  ChartBarIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ServerStackIcon,
} from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import type { ServerStatus, DiskSpace, BackupHealthStatus } from '../types';

/**
 * Props interface for the SystemStatus component.
 * @interface SystemStatusProps
 */
interface SystemStatusProps {
  /** Current server status or null if not yet loaded */
  serverStatus: ServerStatus | null;
  /** Disk space information or null if not yet loaded */
  diskSpace: DiskSpace | null;
  /** Backup health status or null if not yet loaded */
  backupHealth: BackupHealthStatus | null;
  /** Whether the component is currently loading data */
  loading: boolean;
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
  loading,
}: SystemStatusProps): JSX.Element {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  /**
   * Determines the aggregate health status color.
   * Red takes priority over yellow, yellow over green.
   *
   * @returns {'danger' | 'warning' | 'success'} Health status color
   */
  const getHealthColor = (): 'danger' | 'warning' | 'success' => {
    // Critical conditions (red)
    if (serverStatus && serverStatus.status !== 'running') return 'danger';
    if (backupHealth && !backupHealth.scheduler_active) return 'danger';
    if (diskSpace && diskSpace.used_percent > 90) return 'danger';

    // Warning conditions (yellow)
    if (diskSpace && diskSpace.used_percent > 75) return 'warning';

    // All healthy (green)
    return 'success';
  };

  /**
   * Renders the server status badge.
   */
  const renderServerStatus = (): JSX.Element => {
    if (loading || !serverStatus) {
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
            {backupHealth.scheduler_active ? (
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
          {backupHealth.last_successful_backup && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-default-500">Last Backup</span>
              <Chip size="sm" variant="flat" color="default" startContent={<ClockIcon className="h-3 w-3" />}>
                {dayjs(backupHealth.last_successful_backup * 1000).fromNow()}
              </Chip>
            </div>
          )}
          {backupHealth.last_error && (
            <div className="rounded bg-danger-50 p-2 dark:bg-danger-900/20">
              <p className="text-xs text-danger" title={backupHealth.last_error}>
                Error: {backupHealth.last_error}
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
              value={diskSpace.used_percent}
              color={
                diskSpace.used_percent > 90
                  ? 'danger'
                  : diskSpace.used_percent > 75
                    ? 'warning'
                    : 'success'
              }
              className="flex-1"
              aria-label="Disk space usage"
            />
            <Chip
              size="sm"
              variant="flat"
              color={
                diskSpace.used_percent > 90
                  ? 'danger'
                  : diskSpace.used_percent > 75
                    ? 'warning'
                    : 'success'
              }
            >
              {diskSpace.used_percent}%
            </Chip>
          </div>
        </div>
      )}
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
                className={`absolute inline-flex h-full w-full rounded-full ${
                  healthColor === 'danger'
                    ? 'bg-danger animate-ping-danger'
                    : healthColor === 'warning'
                      ? 'bg-warning animate-ping-warning'
                      : 'bg-success animate-ping-success'
                }`}
                style={{ animationIterationCount: 'infinite' }}
              />
              {/* Solid center dot */}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  healthColor === 'danger'
                    ? 'bg-danger'
                    : healthColor === 'warning'
                      ? 'bg-warning'
                      : 'bg-success'
                }`}
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
