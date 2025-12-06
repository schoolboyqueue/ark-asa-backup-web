/**
 * @fileoverview Table header component for backups list.
 * Handles column rendering and sorting UI.
 */

import { useMemo } from 'react';
import { TableHeader, TableColumn } from '@heroui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface BackupsTableHeaderProps {
  readonly columns: Column[];
  readonly sortColumn: string | null;
  readonly sortDirection: 'asc' | 'desc';
  readonly onSort: (columnKey: string) => void;
}

export default function BackupsTableHeader({
  columns,
  sortColumn,
  sortDirection,
  onSort,
}: BackupsTableHeaderProps) {
  const memoizedColumns = useMemo(() => columns, [columns]);

  return (
    <TableHeader columns={memoizedColumns}>
      {(column) => (
        <TableColumn
          key={column.key}
          className={column.sortable ? 'cursor-pointer' : ''}
          onClick={() => column.sortable && onSort(column.key)}
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
      )}
    </TableHeader>
  );
}
