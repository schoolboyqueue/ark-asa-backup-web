/**
 * @fileoverview Save info extraction service for ARK ASA Backup Manager.
 * Extracts game-specific metadata from backup archives including map name,
 * player count, tribe count, and generates suggested tags.
 *
 * Design Pattern: Service Layer - Pure business logic with no HTTP concerns.
 */

import path from 'path';
import tar from 'tar';
import type { SaveInfo } from '../types/index.js';
import { BACKUP_STORAGE_DIRECTORY } from '../config/constants.js';
import { Logger } from '../utils/logger.js';

// ============================================================================
// Map Name Mappings
// ============================================================================

/**
 * Map internal ARK map names to human-readable display names.
 * ARK uses "_WP" suffix for world partition maps in ASA.
 */
const MAP_DISPLAY_NAMES: Record<string, string> = {
  TheIsland_WP: 'The Island',
  TheIsland: 'The Island',
  ScorchedEarth_WP: 'Scorched Earth',
  ScorchedEarth_P: 'Scorched Earth',
  Aberration_WP: 'Aberration',
  Aberration_P: 'Aberration',
  Extinction_WP: 'Extinction',
  Extinction: 'Extinction',
  TheCenter_WP: 'The Center',
  TheCenter: 'The Center',
  Ragnarok_WP: 'Ragnarok',
  Ragnarok: 'Ragnarok',
  Valguero_WP: 'Valguero',
  Valguero_P: 'Valguero',
  Genesis_WP: 'Genesis: Part 1',
  Genesis: 'Genesis: Part 1',
  Gen2_WP: 'Genesis: Part 2',
  Gen2: 'Genesis: Part 2',
  CrystalIsles_WP: 'Crystal Isles',
  CrystalIsles: 'Crystal Isles',
  LostIsland_WP: 'Lost Island',
  LostIsland: 'Lost Island',
  Fjordur_WP: 'Fjordur',
  Fjordur: 'Fjordur',
};

/**
 * Gets human-readable map name from internal map name.
 *
 * @param mapName - Internal map name (e.g., "TheIsland_WP")
 * @returns Human-readable display name (e.g., "The Island")
 */
function getMapDisplayName(mapName: string): string {
  return (
    MAP_DISPLAY_NAMES[mapName] ||
    mapName
      .replace(/_WP$|_P$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
  );
}

// ============================================================================
// Time-Based Tag Generation
// ============================================================================

/**
 * Gets time-of-day tag based on backup creation hour.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Time period tag (morning, afternoon, evening, night)
 */
function getTimeOfDayTag(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Gets day-type tag based on backup creation day.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Day type tag (weekend or weekday)
 */
function getDayTypeTag(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday';
}

// ============================================================================
// Archive Analysis
// ============================================================================

/**
 * Archive entry information extracted during tar listing.
 */
interface ArchiveEntry {
  /** File path within archive */
  path: string;
  /** File size in bytes */
  size: number;
}

/**
 * Extracts save information from a backup archive.
 * Analyzes the tar.gz contents to determine map name, player count, etc.
 *
 * @param backupFileName - Name of the backup archive file
 * @returns Promise resolving to extracted SaveInfo or null if extraction fails
 * @async
 */
export async function extractSaveInfo(backupFileName: string): Promise<SaveInfo | null> {
  const backupFilePath = path.join(BACKUP_STORAGE_DIRECTORY, backupFileName);
  const archiveEntries: ArchiveEntry[] = [];

  try {
    // List archive contents with file sizes
    await tar.list({
      file: backupFilePath,
      onentry: (entry) => {
        archiveEntries.push({
          path: entry.path,
          size: entry.size || 0,
        });
      },
    });

    // Extract map name from directory structure
    // Supports multiple formats:
    // 1. ./SavedArks/MapName/ or SavedArks/MapName/ (nested structure)
    // 2. ./MapName/ or MapName/ (direct map directory at root)
    let mapName = 'Unknown';

    // Pattern 1: Look for SavedArks/MapName structure
    const nestedMapDirPattern = /(?:\.\/)?SavedArks\/([^/]+)\//;
    for (const entry of archiveEntries) {
      const match = entry.path.match(nestedMapDirPattern);
      if (match) {
        mapName = match[1];
        break;
      }
    }

    // Pattern 2: Look for direct map directory at root (./MapName_WP/ or ./MapName/)
    // This matches known ARK map naming conventions
    if (mapName === 'Unknown') {
      // Match directory entries like ./TheIsland_WP/ or TheIsland_WP/filename
      const directMapDirPattern = /^(?:\.\/)?([A-Za-z0-9_]+)\/(?:[^/]+)?$/;
      for (const entry of archiveEntries) {
        const match = entry.path.match(directMapDirPattern);
        if (match) {
          const potentialMapName = match[1];
          // Verify it's a known map name from our mapping
          if (MAP_DISPLAY_NAMES[potentialMapName]) {
            mapName = potentialMapName;
            break;
          }
        }
      }
    }

    // Pattern 2b: If still unknown, try looser match for map directories
    if (mapName === 'Unknown') {
      const looseMapDirPattern = /^(?:\.\/)?([A-Za-z][A-Za-z0-9]*(?:_WP|_P)?)\/[^/]+/;
      for (const entry of archiveEntries) {
        const match = entry.path.match(looseMapDirPattern);
        if (match) {
          mapName = match[1];
          break;
        }
      }
    }

    // Pattern 3: Look for main .ark file to determine map name
    // Match files like TheIsland_WP.ark but not timestamped ones like TheIsland_WP_28.11.2025_03.01.45.ark
    if (mapName === 'Unknown') {
      const mainArkPattern = /([A-Za-z]+(?:_WP|_P|[0-9])?)\.ark$/;
      const timestampPattern = /_\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}\.\d{2}\.ark$/;
      for (const entry of archiveEntries) {
        // Skip timestamped autosave files
        if (timestampPattern.test(entry.path)) {
          continue;
        }
        const arkMatch = entry.path.match(mainArkPattern);
        if (arkMatch) {
          mapName = arkMatch[1];
          break;
        }
      }
    }

    // Count player profiles (.arkprofile files)
    const playerProfiles = archiveEntries.filter((entry) => entry.path.endsWith('.arkprofile'));
    const playerCount = playerProfiles.length;

    // Count tribes (.arktribe files)
    const tribes = archiveEntries.filter((entry) => entry.path.endsWith('.arktribe'));
    const tribeCount = tribes.length;

    // Count auto-saves (timestamped .ark files like MapName_DD.MM.YYYY_HH.MM.SS.ark)
    const autoSavePattern = /_\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}\.\d{2}\.ark$/;
    const autoSaves = archiveEntries.filter((entry) => autoSavePattern.test(entry.path));
    const autoSaveCount = autoSaves.length;

    // Find main save file size (MapName.ark without timestamp)
    let mainSaveSizeBytes = 0;
    const mainSavePattern = new RegExp(`${mapName}\\.ark$`);
    for (const entry of archiveEntries) {
      if (mainSavePattern.test(entry.path) && !autoSavePattern.test(entry.path)) {
        mainSaveSizeBytes = entry.size;
        break;
      }
    }

    // Generate suggested tags
    const suggestedTags = generateSuggestedTags(
      mapName,
      playerCount,
      tribeCount,
      Math.floor(Date.now() / 1000)
    );

    const saveInfo: SaveInfo = {
      map_name: mapName,
      map_display_name: getMapDisplayName(mapName),
      player_count: playerCount,
      tribe_count: tribeCount,
      auto_save_count: autoSaveCount,
      main_save_size_bytes: mainSaveSizeBytes,
      total_file_count: archiveEntries.length,
      suggested_tags: suggestedTags,
    };

    Logger.info(`[SaveInfo] Extracted from ${backupFileName}:`, {
      map: saveInfo.map_display_name,
      players: playerCount,
      tribes: tribeCount,
    });

    return saveInfo;
  } catch (extractionError) {
    Logger.error(`[SaveInfo] Failed to extract from ${backupFileName}:`, extractionError);
    return null;
  }
}

// ============================================================================
// Tag Generation
// ============================================================================

/**
 * Generates suggested tags based on extracted save information.
 *
 * @param mapName - Internal map name
 * @param playerCount - Number of player profiles
 * @param tribeCount - Number of tribes
 * @param timestamp - Backup creation timestamp (Unix seconds)
 * @returns Array of suggested tag strings
 */
export function generateSuggestedTags(
  mapName: string,
  playerCount: number,
  tribeCount: number,
  timestamp: number
): string[] {
  const tags: string[] = [];

  // Map tag (normalized to lowercase, remove _WP suffix)
  const normalizedMapName = mapName.toLowerCase().replace(/_wp$|_p$/, '');
  tags.push(`map:${normalizedMapName}`);

  // Player count tags
  if (playerCount === 0) {
    tags.push('no-players');
  } else if (playerCount === 1) {
    tags.push('singleplayer');
  } else {
    tags.push('multiplayer');
    tags.push(`players:${playerCount}`);
  }

  // Tribe tags
  if (tribeCount > 0) {
    tags.push('has-tribes');
    if (tribeCount > 1) {
      tags.push(`tribes:${tribeCount}`);
    }
  }

  // Time-based tags
  tags.push(getTimeOfDayTag(timestamp));
  tags.push(getDayTypeTag(timestamp));

  return tags;
}

/**
 * Extracts save info from current save directory (before archiving).
 * Used for generating tags during manual backup creation.
 *
 * @param saveDirectory - Path to ARK SavedArks directory
 * @returns Promise resolving to partial SaveInfo with suggested tags
 * @async
 */
export async function extractSaveInfoFromDirectory(
  saveDirectory: string
): Promise<Partial<SaveInfo> | null> {
  const { promises: fs } = await import('fs');

  try {
    // Find map directories
    const entries = await fs.readdir(saveDirectory, { withFileTypes: true });
    const mapDirs = entries.filter((entry) => entry.isDirectory());

    if (mapDirs.length === 0) {
      return null;
    }

    // Use first map directory found
    const mapName = mapDirs[0].name;
    const mapPath = path.join(saveDirectory, mapName);

    // Count files in map directory
    const mapFiles = await fs.readdir(mapPath);

    const playerCount = mapFiles.filter((f) => f.endsWith('.arkprofile')).length;
    const tribeCount = mapFiles.filter((f) => f.endsWith('.arktribe')).length;
    const autoSaveCount = mapFiles.filter((f) =>
      /_\d{2}\.\d{2}\.\d{4}_\d{2}\.\d{2}\.\d{2}\.ark$/.test(f)
    ).length;

    const suggestedTags = generateSuggestedTags(
      mapName,
      playerCount,
      tribeCount,
      Math.floor(Date.now() / 1000)
    );

    return {
      map_name: mapName,
      map_display_name: getMapDisplayName(mapName),
      player_count: playerCount,
      tribe_count: tribeCount,
      auto_save_count: autoSaveCount,
      suggested_tags: suggestedTags,
    };
  } catch (error) {
    Logger.error('[SaveInfo] Failed to extract from directory:', error);
    return null;
  }
}
