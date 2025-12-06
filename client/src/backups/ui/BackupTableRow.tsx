/**
 * @fileoverview Individual backup table row component.
 * Displays backup information and action buttons.
 */

import { TableRow, TableCell, Button, Tooltip } from '@heroui/react';
import {
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import NumberFlow from '@number-flow/react';

import type { Backup } from '../domain/backup';
import { parseFileSize, formatTimestamp, formatRelativeTime } from '..';

interface BackupTableRowProps {
  readonly backup: Backup;
  readonly isServerRunning: boolean;
  readonly isVerifying: boolean;
  readonly isDownloading: boolean;
  readonly isDeleting: boolean;
  readonly renderVerificationIcon: (backup: Backup) => JSX.Element;
  readonly onOpenDetails: (backup: Backup) => void;
  readonly onCopyName: (backup: Backup) => void;
  readonly onVerify: (backup: Backup) => void;
  readonly onRestore: (backup: Backup) => void;
  readonly onDownload: (backup: Backup) => void;
  readonly onDelete: (backup: Backup) => void;
}

export default function BackupTableRow({
  backup,
  isServerRunning,
  isVerifying,
  isDownloading,
  isDeleting,
  renderVerificationIcon,
  onOpenDetails,
  onCopyName,
  onVerify,
  onRestore,
  onDownload,
  onDelete,
}: BackupTableRowProps) {
  const parsed = parseFileSize(backup.sizeBytes);

  return (
    <TableRow key={backup.name} className="cursor-pointer" onClick={() => onOpenDetails(backup)}>
      <TableCell>
        <div className="flex items-center gap-2">
          {renderVerificationIcon(backup)}
          <span className="font-semibold hover:text-primary">{backup.name}</span>
          <Tooltip content="Copy backup name to clipboard">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => onCopyName(backup)}
              aria-label={`Copy ${backup.name} to clipboard`}
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </TableCell>

      <TableCell>
        <span className="font-mono tabular-nums">
          <NumberFlow value={parsed.value} suffix={` ${parsed.unit}`} />
        </span>
      </TableCell>

      <TableCell>
        <div className="flex flex-col">
          <span>{formatTimestamp(backup.createdAt)}</span>
          <span className="text-xs text-default-400">{formatRelativeTime(backup.createdAt)}</span>
        </div>
      </TableCell>

      <TableCell>{backup.notes || '—'}</TableCell>

      <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex gap-1">
          <Tooltip content="Verify backup integrity">
            <Button
              isIconOnly
              size="sm"
              color="warning"
              variant="flat"
              isLoading={isVerifying}
              onPress={() => onVerify(backup)}
              aria-label="Verify backup"
            >
              <ShieldCheckIcon className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content={isServerRunning ? 'Stop server first' : 'Restore backup'}>
            <Button
              isIconOnly
              size="sm"
              color="primary"
              variant="flat"
              isDisabled={isServerRunning}
              onPress={() => onRestore(backup)}
              aria-label="Restore backup"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Download backup">
            <Button
              isIconOnly
              size="sm"
              color="success"
              variant="flat"
              isLoading={isDownloading}
              onPress={() => onDownload(backup)}
              aria-label="Download backup"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Delete backup">
            <Button
              isIconOnly
              size="sm"
              color="danger"
              variant="flat"
              isLoading={isDeleting}
              onPress={() => onDelete(backup)}
              aria-label="Delete backup"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
