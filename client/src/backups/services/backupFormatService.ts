/**
 * @fileoverview Backup formatting and display utilities.
 * Uses native browser APIs (Intl) and lightweight libraries for formatting.
 *
 * Clean Architecture: Service Layer
 * - Pure functions only (no side effects)
 * - Leverages native Intl APIs for i18n-ready formatting
 * - Uses pretty-bytes for file size formatting
 */

import prettyBytes from 'pretty-bytes';

// ============================================================================
// File Size Formatting
// ============================================================================

/**
 * Formats byte size to human-readable string.
 * Uses pretty-bytes library for consistent, locale-aware formatting.
 *
 * @param sizeInBytes - Size in bytes
 * @returns Formatted size string (e.g., "123 MB")
 *
 * @example
 * formatFileSize(1024) // "1.02 kB"
 * formatFileSize(1048576) // "1.05 MB"
 */
export function formatFileSize(sizeInBytes: number): string {
  return prettyBytes(sizeInBytes);
}

/**
 * File size unit for animated display.
 */
export type FileSizeUnit = 'B' | 'kB' | 'MB' | 'GB' | 'TB';

/**
 * Parsed file size with numeric value and unit separated.
 * Useful for animated number displays (e.g., NumberFlow).
 */
export interface ParsedFileSize {
  /** Numeric value (e.g., 123.45) */
  value: number;
  /** Unit string (e.g., "MB") */
  unit: FileSizeUnit;
}

/**
 * Parses byte size into numeric value and unit for animated display.
 * Uses pretty-bytes internally then extracts components.
 *
 * @param sizeInBytes - Size in bytes
 * @returns Parsed size with value and unit
 *
 * @example
 * parseFileSize(1048576) // { value: 1.05, unit: "MB" }
 */
export function parseFileSize(sizeInBytes: number): ParsedFileSize {
  const formatted = prettyBytes(sizeInBytes);
  const regex = /^([\d.]+)\s*(.+)$/;
  const match = regex.exec(formatted);

  if (match) {
    return {
      value: Number.parseFloat(match[1]),
      unit: match[2] as FileSizeUnit,
    };
  }

  // Fallback for edge cases
  return { value: sizeInBytes, unit: 'B' };
}

// ============================================================================
// Date/Time Formatting
// ============================================================================

/** Unix timestamp to milliseconds multiplier */
const UNIX_TO_MS = 1000;

/**
 * Formats Unix timestamp to human-readable date string.
 * Uses native Intl.DateTimeFormat for locale-aware formatting.
 *
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns Formatted date string (e.g., "Jan 1, 2024, 12:00:00 PM")
 *
 * @example
 * formatTimestamp(1704110400) // "Jan 1, 2024, 12:00:00 PM"
 */
export function formatTimestamp(unixTimestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(unixTimestamp * UNIX_TO_MS));
}

/** RelativeTimeFormat instance (created once, reused) */
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
});

/** Time unit thresholds in milliseconds */
const TIME_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

/**
 * Formats Unix timestamp to relative time string.
 * Uses native Intl.RelativeTimeFormat for natural language output.
 *
 * @param unixTimestamp - Unix timestamp in seconds
 * @returns Relative time string (e.g., "5 minutes ago", "in 2 hours", "yesterday")
 *
 * @example
 * formatRelativeTime(Date.now() / 1000 - 3600) // "1 hour ago"
 * formatRelativeTime(Date.now() / 1000 - 86400) // "yesterday"
 */
export function formatRelativeTime(unixTimestamp: number): string {
  const diffMs = Date.now() - unixTimestamp * UNIX_TO_MS;

  for (const { unit, ms } of TIME_UNITS) {
    if (Math.abs(diffMs) >= ms || unit === 'second') {
      const value = Math.round(diffMs / ms);
      return relativeTimeFormatter.format(-value, unit);
    }
  }

  return 'just now';
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Extracts a short backup identifier from the full backup name.
 * Domain-specific utility for displaying compact backup references.
 *
 * @param backupName - Full backup filename
 * @returns Short identifier without prefix and extension
 *
 * @example
 * getBackupShortName('saves-2024-01-15_120000.tar.gz') // "2024-01-15_120000"
 */
export function getBackupShortName(backupName: string): string {
  return backupName.replace(/\.tar\.gz$/, '').replace(/^saves-/, '');
}
