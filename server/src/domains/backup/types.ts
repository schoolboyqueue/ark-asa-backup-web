/**
 * @fileoverview Backup domain types and interfaces.
 * Defines the core data structures for backup operations.
 */

export interface BackupMetadata {
  name: string;
  size_bytes: number;
  mtime: number;
  mtime_human?: string;
  notes?: string;
  tags?: string[];
  verification_status?: 'verified' | 'failed' | 'pending' | 'unknown';
  verification_time?: number;
  verified_file_count?: number;
  verification_error?: string;
  save_info?: SaveInfo;
}

export interface VerificationResult {
  status: 'verified' | 'failed' | 'pending' | 'unknown';
  file_count: number;
  verification_time: number;
  error?: string;
}

export interface SaveInfo {
  map_name: string;
  map_display_name: string;
  player_count: number;
  tribe_count: number;
  auto_save_count: number;
  main_save_size_bytes: number;
  total_file_count: number;
  suggested_tags: string[];
}

export interface BackupSettings {
  BACKUP_INTERVAL: number;
  MAX_BACKUPS: number;
  AUTO_SAFETY_BACKUP?: boolean;
}

export interface BackupFileEntry {
  /** Filename */
  name: string;
  /** Modification time in milliseconds */
  mtime: number;
  /** Full file path */
  path: string;
}
