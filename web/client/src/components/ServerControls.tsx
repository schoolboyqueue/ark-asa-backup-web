/**
 * @fileoverview Server Controls component for managing ARK server and backup settings.
 * Consolidates server start/stop actions and backup configuration in a single popover.
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Input,
  ButtonGroup,
  Divider,
  Switch,
} from '@heroui/react';
import {
  Cog6ToothIcon,
  PlayCircleIcon,
  StopCircleIcon,
} from '@heroicons/react/24/solid';
import { api } from '../services/api';
import { toast } from '../services/toast';
import type { ServerStatus, BackupSettings as IBackupSettings } from '../types';

/**
 * Props interface for the ServerControls component.
 * @interface ServerControlsProps
 */
interface ServerControlsProps {
  /** Current server status or null if not yet loaded */
  serverStatus: ServerStatus | null;
  /** Current backup settings or null if not yet loaded */
  settings: IBackupSettings | null;
  /** Callback to handle settings update */
  onSettingsUpdate: (settings: IBackupSettings) => Promise<void>;
  /** Callback to refresh server status */
  onServerRefresh: () => void;
}

/** Minimum allowed backup interval in seconds (1 minute) */
const MIN_BACKUP_INTERVAL_SECONDS = 60;

/** Maximum allowed backup interval in seconds (24 hours) */
const MAX_BACKUP_INTERVAL_SECONDS = 86400;

/** Minimum number of backups to retain */
const MIN_BACKUPS_TO_KEEP = 1;

/** Maximum number of backups to retain */
const MAX_BACKUPS_TO_KEEP = 100;

/**
 * Server controls component with consolidated server management and backup settings.
 * Features:
 * - Server start/stop controls
 * - Backup interval and retention settings
 * - Form validation with error messages
 *
 * @param {ServerControlsProps} props - Component props
 * @returns {JSX.Element} Server controls button with popover
 */
export default function ServerControls({
  serverStatus,
  settings,
  onSettingsUpdate,
  onServerRefresh,
}: ServerControlsProps): JSX.Element {
  const [isStartingServer, setIsStartingServer] = useState<boolean>(false);
  const [isStoppingServer, setIsStoppingServer] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [backupIntervalValue, setBackupIntervalValue] = useState<string>('');
  const [maxBackupsValue, setMaxBackupsValue] = useState<string>('');
  const [autoSafetyBackup, setAutoSafetyBackup] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<{ interval?: string; maxBackups?: string }>({});

  /**
   * Effect to sync form values with settings changes.
   */
  useEffect(() => {
    if (settings) {
      setBackupIntervalValue(String(settings.BACKUP_INTERVAL));
      setMaxBackupsValue(String(settings.MAX_BACKUPS));
      setAutoSafetyBackup(settings.AUTO_SAFETY_BACKUP !== false);
    }
  }, [settings]);

  /**
   * Handles server start request.
   */
  const handleStartServer = async (): Promise<void> => {
    setIsStartingServer(true);
    try {
      await api.startServer();
      toast.success('ARK server started successfully');
      onServerRefresh();
    } catch (error) {
      console.error('Failed to start server:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to start ARK server'
      );
    } finally {
      setIsStartingServer(false);
    }
  };

  /**
   * Handles server stop request.
   */
  const handleStopServer = async (): Promise<void> => {
    setIsStoppingServer(true);
    try {
      await api.stopServer();
      toast.success('ARK server stopped successfully');
      onServerRefresh();
    } catch (error) {
      console.error('Failed to stop server:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to stop ARK server'
      );
    } finally {
      setIsStoppingServer(false);
    }
  };

  /**
   * Validates the form values.
   */
  const validateForm = (): boolean => {
    const errors: { interval?: string; maxBackups?: string } = {};
    const intervalNum = Number(backupIntervalValue);
    const maxBackupsNum = Number(maxBackupsValue);

    if (
      isNaN(intervalNum) ||
      intervalNum < MIN_BACKUP_INTERVAL_SECONDS ||
      intervalNum > MAX_BACKUP_INTERVAL_SECONDS
    ) {
      errors.interval = `Must be between ${MIN_BACKUP_INTERVAL_SECONDS} and ${MAX_BACKUP_INTERVAL_SECONDS}`;
    }

    if (isNaN(maxBackupsNum) || maxBackupsNum < MIN_BACKUPS_TO_KEEP || maxBackupsNum > MAX_BACKUPS_TO_KEEP) {
      errors.maxBackups = `Must be between ${MIN_BACKUPS_TO_KEEP} and ${MAX_BACKUPS_TO_KEEP}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles settings form submission.
   */
  const handleSettingsSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      toast.error('Please correct the validation errors before saving');
      return;
    }

    setIsSavingSettings(true);
    try {
      await onSettingsUpdate({
        BACKUP_INTERVAL: Number(backupIntervalValue),
        MAX_BACKUPS: Number(maxBackupsValue),
        AUTO_SAFETY_BACKUP: autoSafetyBackup,
      });
      toast.success('Backup settings saved successfully');
      setIsPopoverOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save backup settings'
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isServerRunning = serverStatus?.status === 'running';

  const popoverContent = (
    <div className="w-80 space-y-4 p-4">
      <h3 className="text-sm font-semibold">Controls</h3>

      {/* Server Controls */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-default-500">ARK Server</span>
        <ButtonGroup fullWidth size="sm">
          <Button
            color="primary"
            variant="flat"
            isDisabled={isServerRunning}
            isLoading={isStartingServer}
            onPress={handleStartServer}
            startContent={<PlayCircleIcon className="h-4 w-4" />}
          >
            Start
          </Button>
          <Button
            color="danger"
            variant="flat"
            isDisabled={!isServerRunning}
            isLoading={isStoppingServer}
            onPress={handleStopServer}
            startContent={<StopCircleIcon className="h-4 w-4" />}
          >
            Stop
          </Button>
        </ButtonGroup>
      </div>

      <Divider />

      {/* Backup Settings */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-default-500">Backup Settings</span>

        <Input
          type="number"
          label="Backup Interval (seconds)"
          placeholder="1800"
          value={backupIntervalValue}
          onValueChange={setBackupIntervalValue}
          isInvalid={!!formErrors.interval}
          errorMessage={formErrors.interval}
          variant="bordered"
          size="sm"
          min={MIN_BACKUP_INTERVAL_SECONDS}
          max={MAX_BACKUP_INTERVAL_SECONDS}
        />

        <Input
          type="number"
          label="Max Backups to Keep"
          placeholder="2"
          value={maxBackupsValue}
          onValueChange={setMaxBackupsValue}
          isInvalid={!!formErrors.maxBackups}
          errorMessage={formErrors.maxBackups}
          variant="bordered"
          size="sm"
          min={MIN_BACKUPS_TO_KEEP}
          max={MAX_BACKUPS_TO_KEEP}
        />

        <Switch
          isSelected={autoSafetyBackup}
          onValueChange={setAutoSafetyBackup}
          size="sm"
          classNames={{
            base: 'inline-flex flex-row-reverse w-full max-w-full justify-between',
            wrapper: 'mr-0',
          }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm">Auto-Safety Backup</p>
            <p className="text-xs text-default-400">
              Create pre-restore backup automatically
            </p>
          </div>
        </Switch>

        <Button color="primary" onPress={handleSettingsSubmit} isLoading={isSavingSettings} fullWidth size="sm">
          Save Settings
        </Button>
      </div>
    </div>
  );

  return (
    <Popover isOpen={isPopoverOpen} onOpenChange={setIsPopoverOpen} placement="bottom">
      <PopoverTrigger>
        <Button variant="flat" startContent={<Cog6ToothIcon className="h-4 w-4" />}>
          <span className="hidden sm:inline">Controls</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>{popoverContent}</PopoverContent>
    </Popover>
  );
}
