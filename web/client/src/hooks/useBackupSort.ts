/**
 * @fileoverview Custom hook for managing backup sorting state and logic.
 * Provides sorting functionality for backup lists with ascending/descending order.
 * Reduces component state complexity by encapsulating sorting concerns.
 *
 * Design Pattern: Single Responsibility Principle - handles only sorting logic
 */

import { useState, useMemo, useCallback } from 'react';
import type { BackupMetadata } from '../types';

/**
 * Type definition for sort column options.
 * Represents the backup properties that can be used for sorting.
 */
export type SortColumn = 'name' | 'size' | 'date';

/**
 * Type definition for sort direction.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Return type for useBackupSort hook.
 * @interface UseBackupSortReturn
 */
export interface UseBackupSortReturn {
  /** Currently sorted backups array */
  sortedBackups: BackupMetadata[];
  /** Current sort column */
  sortColumn: SortColumn;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Function to toggle sort column (switches direction if same column) */
  toggleSort: (column: SortColumn) => void;
  /** Function to set sort column directly */
  setSortColumn: (column: SortColumn) => void;
  /** Function to set sort direction directly */
  setSortDirection: (direction: SortDirection) => void;
}

/**
 * Custom hook for managing backup list sorting.
 * Handles sort column, direction, and automatically sorts the backup array.
 *
 * Features:
 * - Memoized sorting for performance
 * - Toggle functionality (click same column to reverse)
 * - Support for name, size, and date sorting
 * - Encapsulated state management
 *
 * @param {BackupMetadata[]} backups - Array of backups to sort
 * @param {SortColumn} initialColumn - Initial sort column (default: 'date')
 * @param {SortDirection} initialDirection - Initial sort direction (default: 'desc')
 * @returns {UseBackupSortReturn} Sorted backups and sort controls
 *
 * @example
 * ```typescript
 * const { sortedBackups, sortColumn, sortDirection, toggleSort } = useBackupSort(backups);
 *
 * // Render table header with sort
 * <TableColumn onClick={() => toggleSort('name')}>
 *   Name {sortColumn === 'name' && <SortIcon />}
 * </TableColumn>
 * ```
 */
export function useBackupSort(
  backups: BackupMetadata[],
  initialColumn: SortColumn = 'date',
  initialDirection: SortDirection = 'desc'
): UseBackupSortReturn {
  const [sortColumn, setSortColumn] = useState<SortColumn>(initialColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  /**
   * Toggles the sort column. If the same column is clicked, reverses the direction.
   * If a different column is clicked, sorts by that column in ascending order.
   */
  const toggleSort = useCallback(
    (column: SortColumn): void => {
      if (column === sortColumn) {
        // Same column: toggle direction
        setSortDirection((previousDirection) => (previousDirection === 'asc' ? 'desc' : 'asc'));
      } else {
        // Different column: set new column with ascending order
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  /**
   * Sorts the backups array based on current sort settings.
   * Memoized to avoid unnecessary recalculation.
   */
  const sortedBackups = useMemo(() => {
    const backupsCopy = [...backups];
    backupsCopy.sort((backupA, backupB) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = backupA.name.localeCompare(backupB.name);
          break;
        case 'size':
          comparison = backupA.size_bytes - backupB.size_bytes;
          break;
        case 'date':
          comparison = backupA.mtime - backupB.mtime;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return backupsCopy;
  }, [backups, sortColumn, sortDirection]);

  return {
    sortedBackups,
    sortColumn,
    sortDirection,
    toggleSort,
    setSortColumn,
    setSortDirection,
  };
}
