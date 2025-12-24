/**
 * @fileoverview Table header component for backups list.
 * Handles column rendering and sorting UI.
 */

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { TableColumn } from '@heroui/react';

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface BackupsTableHeaderProps {
  readonly column: Column;
  readonly sortColumn: string | null;
  readonly sortDirection: 'asc' | 'desc';
  readonly onSort: () => void;
}

export default function BackupsTableHeader({
  column,
  sortColumn,
  sortDirection,
  onSort,
}: BackupsTableHeaderProps) {
  return (
    <TableColumn
      className={column.sortable ? 'cursor-pointer' : ''}
      onClick={() => column.sortable && onSort()}
    >
      <div className="flex items-center gap-1">
        <span>{column.label}</span>
        {column.sortable &&
          sortColumn === column.key &&
          (sortDirection === 'asc' ? (
            <ChevronUpIcon className="h-3 w-3" aria-label="Sorted ascending" />
          ) : (
            <ChevronDownIcon className="h-3 w-3" aria-label="Sorted descending" />
          ))}
      </div>
    </TableColumn>
  );
}
