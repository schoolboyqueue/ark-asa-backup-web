/**
 * @fileoverview Card header component for backups list.
 * Displays title, create button, and total count.
 */

import { Button } from '@heroui/react';
import { CircleStackIcon, PlusCircleIcon } from '@heroicons/react/24/solid';
import NumberFlow from '@number-flow/react';

interface BackupsCardHeaderProps {
  readonly backupCount: number;
  readonly isLoading: boolean;
  readonly onCreateBackup: () => void;
}

const PRIMARY_COLOR = '#0ea5e9';

export default function BackupsCardHeader({
  backupCount,
  isLoading,
  onCreateBackup,
}: BackupsCardHeaderProps) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <CircleStackIcon className="h-5 w-5" style={{ color: PRIMARY_COLOR }} />
        <h2 className="text-lg font-semibold">Backups</h2>
      </div>
      <div className="flex items-center gap-4">
        <Button
          color="primary"
          variant="flat"
          size="sm"
          startContent={<PlusCircleIcon className="h-4 w-4" />}
          onPress={onCreateBackup}
          isDisabled={isLoading}
        >
          Create Backup
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-default-500">Total:</span>
          <NumberFlow
            value={backupCount}
            className="text-xl font-bold"
            style={{ color: PRIMARY_COLOR }}
          />
        </div>
      </div>
    </div>
  );
}
