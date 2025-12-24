/**
 * @fileoverview UseCase for updating backup settings.
 * Orchestrates settings validation and update.
 *
 * Clean Architecture: UseCase Layer
 */

import { useCallback, useState } from 'react';
import { toast } from '../../shared/services/toast';
import { serverApiAdapter } from '../adapters/serverApiAdapter';
import type { BackupSettings, UpdateSettingsDto } from '../domain/server';
import { validateBackupSettings } from '../services/settingsValidationService';

/**
 * Props for useUpdateSettings.
 */
export interface UseUpdateSettingsProps {
  /** Callback invoked after successful settings update */
  onSettingsUpdated?: (settings: BackupSettings) => void;
}

/**
 * Return type for useUpdateSettings.
 */
export interface UseUpdateSettingsReturn {
  /** Current form state */
  formState: {
    backupIntervalSeconds: number;
    maxBackupsToKeep: number;
    autoSafetyBackup: boolean;
  };

  /** Form validation errors */
  errors: {
    backupInterval?: string;
    maxBackups?: string;
  };

  /** Whether settings update is in progress */
  isSaving: boolean;

  /** Actions for interacting with settings */
  actions: {
    setBackupInterval: (seconds: number) => void;
    setMaxBackups: (count: number) => void;
    setAutoSafetyBackup: (enabled: boolean) => void;
    handleSubmit: () => Promise<void>;
    loadSettings: (settings: BackupSettings) => void;
  };
}

/**
 * UseCase hook for updating backup settings.
 *
 * @param {UseUpdateSettingsProps} props - Hook configuration
 * @returns {UseUpdateSettingsReturn} Settings form state and actions
 */
export function useUpdateSettings(props: UseUpdateSettingsProps = {}): UseUpdateSettingsReturn {
  const { onSettingsUpdated } = props;
  const [backupIntervalSeconds, setBackupIntervalSeconds] = useState(1800);
  const [maxBackupsToKeep, setMaxBackupsToKeep] = useState(3);
  const [autoSafetyBackup, setAutoSafetyBackup] = useState(true);
  const [errors, setErrors] = useState<{ backupInterval?: string; maxBackups?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback((settings: BackupSettings) => {
    setBackupIntervalSeconds(settings.backupIntervalSeconds);
    setMaxBackupsToKeep(settings.maxBackupsToKeep);
    setAutoSafetyBackup(settings.autoSafetyBackup);
  }, []);

  const handleSubmit = useCallback(async () => {
    // 1. Validate using Service layer
    const validation = validateBackupSettings({
      backupIntervalSeconds,
      maxBackupsToKeep,
      autoSafetyBackup,
    });

    setErrors(validation.errors);

    if (!validation.isValid) {
      toast.error('Please correct the validation errors');
      return;
    }

    setIsSaving(true);

    try {
      // 2. Create DTO
      const dto: UpdateSettingsDto = {
        backupIntervalSeconds,
        maxBackupsToKeep,
        autoSafetyBackup,
      };

      // 3. Call Adapter
      const updatedSettings = await serverApiAdapter.updateSettings(dto);

      // 4. Update repository if callback provided
      if (onSettingsUpdated) {
        onSettingsUpdated(updatedSettings);
      }

      // 5. Success feedback
      toast.success('Backup settings saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings';
      console.error('Failed to save settings:', error);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [backupIntervalSeconds, maxBackupsToKeep, autoSafetyBackup, onSettingsUpdated]);

  return {
    formState: {
      backupIntervalSeconds,
      maxBackupsToKeep,
      autoSafetyBackup,
    },
    errors,
    isSaving,
    actions: {
      setBackupInterval: setBackupIntervalSeconds,
      setMaxBackups: setMaxBackupsToKeep,
      setAutoSafetyBackup,
      handleSubmit,
      loadSettings,
    },
  };
}
