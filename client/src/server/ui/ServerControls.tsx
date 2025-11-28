/**
 * @fileoverview Server Controls component - PURE VIEW LAYER.
 * Displays server control and settings with Clean Architecture.
 *
 * Clean Architecture: View Layer
 */

import { useEffect } from 'react';
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
import { Cog6ToothIcon, PlayCircleIcon, StopCircleIcon } from '@heroicons/react/24/solid';
import {
  useServerRepository,
  useServerControl,
  useUpdateSettings,
  useSettingsRepository,
  MIN_BACKUP_INTERVAL_SECONDS,
  MAX_BACKUP_INTERVAL_SECONDS,
  MIN_BACKUPS_TO_KEEP,
  MAX_BACKUPS_TO_KEEP,
} from '..';
import { useBackupsRepository } from '../../backups/repository/useBackupsRepository';

interface ServerControlsProps {
  /** Popover open state (controlled from parent for now) */
  isOpen?: boolean;
  /** Popover open state change callback */
  onOpenChange?: (open: boolean) => void;
}

export default function ServerControls({ isOpen, onOpenChange }: ServerControlsProps) {
  const { server } = useServerRepository();
  const settingsRepo = useSettingsRepository();
  const backupsRepo = useBackupsRepository();
  const serverControl = useServerControl();
  const updateSettings = useUpdateSettings({
    onSettingsUpdated: (newSettings) => {
      settingsRepo.updateLocalSettings(newSettings);
      backupsRepo.refreshBackups();
    },
  });

  // Load settings when component mounts or settings change
  useEffect(() => {
    if (settingsRepo.settings) {
      updateSettings.actions.loadSettings(settingsRepo.settings);
    }
  }, [settingsRepo.settings, updateSettings.actions]);

  const handleSubmit = async () => {
    await updateSettings.actions.handleSubmit();
    onOpenChange?.(false);
  };

  const isServerRunning = server?.isRunning || false;

  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom">
      <PopoverTrigger>
        <Button variant="flat" startContent={<Cog6ToothIcon className="h-4 w-4" />}>
          <span className="hidden sm:inline">Controls</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
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
                isLoading={serverControl.isStarting}
                onPress={serverControl.startServer}
                startContent={<PlayCircleIcon className="h-4 w-4" />}
              >
                Start
              </Button>
              <Button
                color="danger"
                variant="flat"
                isDisabled={!isServerRunning}
                isLoading={serverControl.isStopping}
                onPress={serverControl.stopServer}
                startContent={<StopCircleIcon className="h-4 w-4" />}
              >
                Stop
              </Button>
            </ButtonGroup>
          </div>

          <Divider />

          {/* Settings Form */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-default-500">Backup Settings</span>

            <Input
              type="number"
              label="Backup Interval (seconds)"
              value={String(updateSettings.formState.backupIntervalSeconds)}
              onValueChange={(val) => updateSettings.actions.setBackupInterval(Number(val))}
              isInvalid={!!updateSettings.errors.backupInterval}
              errorMessage={updateSettings.errors.backupInterval}
              variant="bordered"
              size="sm"
              min={MIN_BACKUP_INTERVAL_SECONDS}
              max={MAX_BACKUP_INTERVAL_SECONDS}
            />

            <Input
              type="number"
              label="Max Backups to Keep"
              value={String(updateSettings.formState.maxBackupsToKeep)}
              onValueChange={(val) => updateSettings.actions.setMaxBackups(Number(val))}
              isInvalid={!!updateSettings.errors.maxBackups}
              errorMessage={updateSettings.errors.maxBackups}
              variant="bordered"
              size="sm"
              min={MIN_BACKUPS_TO_KEEP}
              max={MAX_BACKUPS_TO_KEEP}
            />

            <Switch
              isSelected={updateSettings.formState.autoSafetyBackup}
              onValueChange={updateSettings.actions.setAutoSafetyBackup}
              size="sm"
              classNames={{
                base: 'inline-flex flex-row-reverse w-full max-w-full justify-between',
                wrapper: 'mr-0',
              }}
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm">Auto-Safety Backup</p>
                <p className="text-xs text-default-400">Create pre-restore backup automatically</p>
              </div>
            </Switch>

            <Button
              color="primary"
              onPress={handleSubmit}
              isLoading={updateSettings.isSaving}
              fullWidth
              size="sm"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
