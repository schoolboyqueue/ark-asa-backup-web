/**
 * @fileoverview Settings domain data-access layer.
 * Handles file system operations for settings.
 *
 * **Layer:** Data-Access / Persistence
 * **Responsibility:** Settings file I/O
 * **Dependencies:** File system
 * **Used By:** Settings service
 */

import { promises as fs } from 'node:fs';

/**
 * Loads settings from a configuration file.
 *
 * @param configPath - Path to configuration file
 * @returns Parsed settings object
 */
export async function loadSettingsFile(configPath: string): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const settings: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, value] = trimmed.split('=');
      if (key && value) {
        settings[key.trim()] = value.trim();
      }
    }

    return settings;
  } catch {
    return {};
  }
}

/**
 * Saves settings to a configuration file.
 *
 * @param configPath - Path to configuration file
 * @param settings - Settings to save
 */
export async function saveSettingsFile(
  configPath: string,
  settings: Record<string, string>
): Promise<void> {
  const lines = Object.entries(settings).map(([key, value]) => `${key}=${value}`);
  const content = lines.join('\n');
  await fs.writeFile(configPath, content, 'utf-8');
}
