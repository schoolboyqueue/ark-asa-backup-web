/**
 * @fileoverview Backup formatting and display business logic.
 * Pure functions for formatting backup data for human-readable display.
 * Contains presentation rules for dates, sizes, and other backup metadata.
 *
 * Clean Architecture: Service Layer
 * - Pure functions only (no side effects)
 * - No framework dependencies (no dayjs, use native Date)
 * - Reusable formatting logic
 */

/** Bytes per kilobyte */
const BYTES_PER_KB = 1024;

/** Bytes per megabyte */
const BYTES_PER_MB = 1024 * 1024;

/** Bytes per gigabyte */
const BYTES_PER_GB = 1024 * 1024 * 1024;

/** Unix timestamp to milliseconds multiplier */
const UNIX_TO_MS = 1000;

/** Milliseconds per second */
const MS_PER_SECOND = 1000;

/** Milliseconds per minute */
const MS_PER_MINUTE = 60 * 1000;

/** Milliseconds per hour */
const MS_PER_HOUR = 60 * 60 * 1000;

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Formats byte size to human-readable string with appropriate unit.
 * Automatically selects KB, MB, or GB based on size.
 *
 * @param {number} sizeInBytes - Size in bytes
 * @returns {string} Formatted size string (e.g., "123.45 MB")
 *
 * @example
 * formatFileSize(1024) // "1.00 KB"
 * formatFileSize(1048576) // "1.00 MB"
 * formatFileSize(1073741824) // "1.00 GB"
 */
export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes >= BYTES_PER_GB) {
    return `${(sizeInBytes / BYTES_PER_GB).toFixed(2)} GB`;
  }

  if (sizeInBytes >= BYTES_PER_MB) {
    return `${(sizeInBytes / BYTES_PER_MB).toFixed(2)} MB`;
  }

  if (sizeInBytes >= BYTES_PER_KB) {
    return `${(sizeInBytes / BYTES_PER_KB).toFixed(2)} KB`;
  }

  return `${sizeInBytes} B`;
}

/**
 * Formats Unix timestamp to human-readable date string.
 *
 * @param {number} unixTimestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string (e.g., "Jan 1, 2024 12:00:00 PM")
 *
 * @example
 * formatTimestamp(1704110400) // "Jan 1, 2024 12:00:00 PM"
 */
export function formatTimestamp(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * UNIX_TO_MS);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', options);
}

/**
 * Formats Unix timestamp to relative time string (e.g., "2 hours ago").
 * Provides human-friendly time descriptions.
 *
 * @param {number} unixTimestamp - Unix timestamp in seconds
 * @returns {string} Relative time string
 *
 * @example
 * formatRelativeTime(Date.now() / 1000 - 3600) // "1 hour ago"
 * formatRelativeTime(Date.now() / 1000 + 3600) // "in 1 hour"
 */
export function formatRelativeTime(unixTimestamp: number): string {
  const nowMs = Date.now();
  const timestampMs = unixTimestamp * UNIX_TO_MS;
  const diffMs = nowMs - timestampMs;
  const absDiffMs = Math.abs(diffMs);

  const isFuture = diffMs < 0;

  // Seconds
  if (absDiffMs < MS_PER_MINUTE) {
    const seconds = Math.floor(absDiffMs / MS_PER_SECOND);
    return isFuture ? `in ${seconds}s` : `${seconds}s ago`;
  }

  // Minutes
  if (absDiffMs < MS_PER_HOUR) {
    const minutes = Math.floor(absDiffMs / MS_PER_MINUTE);
    return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  }

  // Hours
  if (absDiffMs < MS_PER_DAY) {
    const hours = Math.floor(absDiffMs / MS_PER_HOUR);
    return isFuture ? `in ${hours}h` : `${hours}h ago`;
  }

  // Days
  const days = Math.floor(absDiffMs / MS_PER_DAY);
  if (days < 30) {
    return isFuture ? `in ${days}d` : `${days}d ago`;
  }

  // Months (approximate)
  const months = Math.floor(days / 30);
  if (months < 12) {
    return isFuture ? `in ${months}mo` : `${months}mo ago`;
  }

  // Years (approximate)
  const years = Math.floor(days / 365);
  return isFuture ? `in ${years}y` : `${years}y ago`;
}

/**
 * Formats an array of tags into a comma-separated string.
 *
 * @param {ReadonlyArray<string>} tags - Tags to format
 * @returns {string} Comma-separated tag list
 *
 * @example
 * formatTags(['pre-boss', 'milestone']) // "pre-boss, milestone"
 */
export function formatTags(tags: ReadonlyArray<string>): string {
  if (!tags || tags.length === 0) {
    return '';
  }

  return tags.join(', ');
}

/**
 * Truncates text to a maximum length with ellipsis.
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 *
 * @example
 * truncateText('This is a very long backup note', 20)
 * // Returns: "This is a very lon..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extracts a short backup identifier from the full backup name.
 * Useful for displaying compact backup references.
 *
 * @param {string} backupName - Full backup filename
 * @returns {string} Short identifier
 *
 * @example
 * getBackupShortName('saves-2024-01-15_120000.tar.gz')
 * // Returns: "2024-01-15_120000"
 */
export function getBackupShortName(backupName: string): string {
  // Remove .tar.gz extension
  const withoutExtension = backupName.replace(/\.tar\.gz$/, '');

  // Remove 'saves-' prefix if present
  const withoutPrefix = withoutExtension.replace(/^saves-/, '');

  return withoutPrefix;
}
