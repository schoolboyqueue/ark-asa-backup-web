/**
 * @fileoverview Custom hook for managing backup list pagination state and logic.
 * Provides pagination controls and page calculation for backup lists.
 * Reduces component state complexity by encapsulating pagination concerns.
 *
 * Design Pattern: Single Responsibility Principle - handles only pagination logic
 * Clean Architecture: UI Helper (not domain logic, just UI state management)
 */

import { useEffect, useMemo, useState } from 'react';
import type { Backup } from '../domain/backup';

/**
 * Return type for useBackupPagination hook.
 * @interface UseBackupPaginationReturn
 */
export interface UseBackupPaginationReturn {
  /** Current page of paginated backups */
  paginatedBackups: Backup[];
  /** Current page number (1-indexed) */
  page: number;
  /** Number of rows per page */
  rowsPerPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items */
  totalItems: number;
  /** Function to set the current page */
  setPage: (page: number) => void;
  /** Function to go to next page */
  nextPage: () => void;
  /** Function to go to previous page */
  previousPage: () => void;
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Whether there is a previous page available */
  hasPreviousPage: boolean;
}

/**
 * Custom hook for managing backup list pagination.
 * Handles page state, page calculations, and automatically paginates the backup array.
 *
 * Features:
 * - Memoized pagination for performance
 * - Auto-reset to page 1 when total pages changes
 * - Navigation helpers (next/previous page)
 * - Page bounds checking
 * - Configurable rows per page
 *
 * @param {Backup[]} backups - Array of backups to paginate
 * @param {number} itemsPerPage - Number of items to display per page (default: 10)
 * @returns {UseBackupPaginationReturn} Paginated backups and pagination controls
 *
 * @example
 * ```typescript
 * const {
 *   paginatedBackups,
 *   page,
 *   totalPages,
 *   setPage,
 *   nextPage,
 *   previousPage,
 *   hasNextPage,
 *   hasPreviousPage
 * } = useBackupPagination(filteredBackups, 10);
 *
 * // Render pagination controls
 * <Pagination
 *   page={page}
 *   total={totalPages}
 *   onChange={setPage}
 * />
 * ```
 */
export function useBackupPagination(
  backups: Backup[],
  itemsPerPage: number = 10
): UseBackupPaginationReturn {
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = itemsPerPage;

  /**
   * Calculate total number of pages based on items and rows per page.
   */
  const totalPages = useMemo(
    () => Math.ceil(backups.length / rowsPerPage),
    [backups.length, rowsPerPage]
  );

  /**
   * Extract the current page of backups from the full array.
   */
  const paginatedBackups = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return backups.slice(startIndex, endIndex);
  }, [backups, page, rowsPerPage]);

  /**
   * Reset to page 1 when the total number of pages changes and current page exceeds bounds.
   * This handles cases where filtering reduces the total pages below the current page.
   */
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [page, totalPages]);

  /**
   * Navigate to the next page if available.
   */
  const nextPage = (): void => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  /**
   * Navigate to the previous page if available.
   */
  const previousPage = (): void => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    paginatedBackups,
    page,
    rowsPerPage,
    totalPages,
    totalItems: backups.length,
    setPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  };
}
