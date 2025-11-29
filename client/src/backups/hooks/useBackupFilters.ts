/**
 * @fileoverview Custom hook for managing backup filtering state and logic.
 * Provides search and date range filtering functionality for backup lists.
 * Reduces component state complexity by encapsulating filtering concerns.
 *
 * Design Pattern: Single Responsibility Principle - handles only filtering logic
 * Clean Architecture: UI Helper (not domain logic, just UI state management)
 */

import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import type { Backup } from '../domain/backup';

/**
 * Return type for useBackupFilters hook.
 * @interface UseBackupFiltersReturn
 */
export interface UseBackupFiltersReturn {
  /** Filtered backups array */
  filteredBackups: Backup[];
  /** Current search query */
  searchQuery: string;
  /** Current date range start (YYYY-MM-DD format) */
  dateRangeStart: string;
  /** Current date range end (YYYY-MM-DD format) */
  dateRangeEnd: string;
  /** Whether any filters are currently active */
  hasActiveFilters: boolean;
  /** Function to update search query */
  setSearchQuery: (query: string) => void;
  /** Function to update date range start */
  setDateRangeStart: (date: string) => void;
  /** Function to update date range end */
  setDateRangeEnd: (date: string) => void;
  /** Function to clear all filters */
  clearFilters: () => void;
}

/**
 * Custom hook for managing backup list filtering.
 * Handles search query, date range filtering, and automatically filters the backup array.
 *
 * Features:
 * - Search by backup name or notes (case-insensitive)
 * - Filter by date range (start and/or end dates)
 * - Memoized filtering for performance
 * - Clear all filters functionality
 * - Active filters detection
 *
 * @param {Backup[]} backups - Array of backups to filter
 * @returns {UseBackupFiltersReturn} Filtered backups and filter controls
 *
 * @example
 * ```typescript
 * const {
 *   filteredBackups,
 *   searchQuery,
 *   setSearchQuery,
 *   dateRangeStart,
 *   setDateRangeStart,
 *   clearFilters,
 *   hasActiveFilters
 * } = useBackupFilters(backups);
 *
 * // Render search input
 * <Input value={searchQuery} onValueChange={setSearchQuery} />
 *
 * // Render clear filters button
 * {hasActiveFilters && <Button onPress={clearFilters}>Clear Filters</Button>}
 * ```
 */
export function useBackupFilters(backups: Backup[]): UseBackupFiltersReturn {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  /**
   * Determines if any filters are currently active.
   */
  const hasActiveFilters = useMemo(() => {
    return !!(searchQuery.trim() || dateRangeStart || dateRangeEnd);
  }, [searchQuery, dateRangeStart, dateRangeEnd]);

  /**
   * Clears all active filters and resets to default state.
   */
  const clearFilters = useCallback((): void => {
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
  }, []);

  /**
   * Filters the backups array based on current filter settings.
   * Memoized to avoid unnecessary recalculation.
   */
  const filteredBackups = useMemo(() => {
    let filtered = [...backups];

    // Apply search filter (searches both backup name and notes)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((backup) => {
        const nameMatch = backup.name.toLowerCase().includes(lowerQuery);
        const notesMatch = backup.notes?.toLowerCase().includes(lowerQuery) || false;
        const tagsMatch =
          backup.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) || false;
        return nameMatch || notesMatch || tagsMatch;
      });
    }

    // Apply date range filter
    if (dateRangeStart || dateRangeEnd) {
      const startTimestamp = dateRangeStart ? dayjs(dateRangeStart).startOf('day').unix() : 0;
      const endTimestamp = dateRangeEnd
        ? dayjs(dateRangeEnd).endOf('day').unix()
        : Number.MAX_SAFE_INTEGER;

      filtered = filtered.filter((backup) => {
        return backup.createdAt >= startTimestamp && backup.createdAt <= endTimestamp;
      });
    }

    return filtered;
  }, [backups, searchQuery, dateRangeStart, dateRangeEnd]);

  return {
    filteredBackups,
    searchQuery,
    dateRangeStart,
    dateRangeEnd,
    hasActiveFilters,
    setSearchQuery,
    setDateRangeStart,
    setDateRangeEnd,
    clearFilters,
  };
}
