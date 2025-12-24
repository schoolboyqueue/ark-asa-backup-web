/**
 * @fileoverview Individual backup table row component.
 * Displays backup information and action buttons.
 */

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { TableCell, TableRow, Tooltip } from '@heroui/react';
import NumberFlow from '@number-flow/react';
import { formatRelativeTime, formatTimestamp, parseFileSize } from '..';
import type { Backup } from '../domain/backup';

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
    <TableRow className="cursor-pointer" onClick={() => onOpenDetails(backup)}>
      <TableCell>
        <div className="flex items-center gap-2">
          {renderVerificationIcon(backup)}
          <span className="font-semibold hover:text-primary">{backup.name}</span>
          <Tooltip content="Copy backup name to clipboard">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyName(backup);
              }}
              className="rounded p-1 hover:bg-default-200"
              aria-label={`Copy ${backup.name} to clipboard`}
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
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
            <button
              onClick={() => onVerify(backup)}
              disabled={isVerifying}
              className="rounded p-1 hover:bg-warning/20 disabled:opacity-50"
              aria-label="Verify backup"
            >
              <ShieldCheckIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content={isServerRunning ? 'Stop server first' : 'Restore backup'}>
            <button
              onClick={() => onRestore(backup)}
              disabled={isServerRunning}
              className="rounded p-1 hover:bg-primary/20 disabled:opacity-50"
              aria-label="Restore backup"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content="Download backup">
            <button
              onClick={() => onDownload(backup)}
              disabled={isDownloading}
              className="rounded p-1 hover:bg-success/20 disabled:opacity-50"
              aria-label="Download backup"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <Tooltip content="Delete backup">
            <button
              onClick={() => onDelete(backup)}
              disabled={isDeleting}
              className="rounded p-1 hover:bg-danger/20 disabled:opacity-50"
              aria-label="Delete backup"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
