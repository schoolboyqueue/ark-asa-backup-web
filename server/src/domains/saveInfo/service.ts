/**
 * @fileoverview Save info extraction service.
 * Extracts game-specific metadata from backup archives.
 *
 * **Layer:** Domain / Business Logic
 * **Responsibility:** Parse ARK save files and extract metadata
 * **Dependencies:** Tar extraction, file system
 * **Used By:** Backup service
 */

import path from 'path';
import tar from 'tar';
import type { SaveInfo } from '../backup/types.js';

/**
 * Map internal ARK map names to human-readable display names.
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
  Ragnarok_WP: 'Ragnarok',
  Ragnarok: 'Ragnarok',
  CrystalIsles_WP: 'Crystal Isles',
  CrystalIsles: 'Crystal Isles',
  Genesis_WP: 'Genesis',
  Genesis: 'Genesis',
  Genesis2_WP: 'Genesis Part 2',
  Genesis2: 'Genesis Part 2',
};

/**
 * Extracts save information from a backup archive.
 *
 * **Why:** Provides users with useful metadata about their backups
 * (map name, player count, etc.) for better organization.
 *
 * @param backupDir - Directory containing the backup
 * @param backupFileName - Name of the backup archive
 * @returns Save information extracted from the backup
 */
export async function extractSaveInfo(
  backupDir: string,
  backupFileName: string
): Promise<SaveInfo> {
  const backupPath = path.join(backupDir, backupFileName);

  let mapName = 'Unknown';
  let playerCount = 0;
  let tribeCount = 0;
  let autoSaveCount = 0;
  let mainSaveSize = 0;
  let totalFileCount = 0;

  // Parse tar archive to extract metadata
  await tar.list({
    file: backupPath,
    onentry: (entry) => {
      totalFileCount++;

      // Extract map name from directory structure
      if (entry.path.includes('/Saved/')) {
        const parts = entry.path.split('/');
        const savedIndex = parts.indexOf('Saved');
        if (savedIndex > 0) {
          mapName = parts[savedIndex - 1];
        }
      }

      // Count player profiles
      if (entry.path.endsWith('.arkprofile')) {
        playerCount++;
      }

      // Count tribes
      if (entry.path.endsWith('.arktribe')) {
        tribeCount++;
      }

      // Count auto-saves
      if (entry.path.match(/\d{8}_\d{6}\.ark$/)) {
        autoSaveCount++;
      }

      // Get main save file size
      if (entry.path.endsWith('TheIsland.ark') || entry.path.endsWith('SaveGame.ark')) {
        mainSaveSize = entry.size || 0;
      }
    },
  });

  const displayName = MAP_DISPLAY_NAMES[mapName] || mapName;

  return {
    map_name: mapName,
    map_display_name: displayName,
    player_count: playerCount,
    tribe_count: tribeCount,
    auto_save_count: autoSaveCount,
    main_save_size_bytes: mainSaveSize,
    total_file_count: totalFileCount,
    suggested_tags: generateSuggestedTags(mapName, playerCount, tribeCount),
  };
}

/**
 * Generates suggested tags based on save information.
 *
 * **Why:** Helps users quickly tag backups with relevant information.
 *
 * @param mapName - Map name
 * @param playerCount - Number of players
 * @param tribeCount - Number of tribes
 * @returns Array of suggested tags
 */
function generateSuggestedTags(mapName: string, playerCount: number, tribeCount: number): string[] {
  const tags: string[] = [];

  // Add map tag
  if (mapName) {
    tags.push(mapName);
  }

  // Add player/tribe tags
  if (playerCount > 0) {
    tags.push(`players-${playerCount}`);
  }
  if (tribeCount > 0) {
    tags.push(`tribes-${tribeCount}`);
  }

  return tags;
}
