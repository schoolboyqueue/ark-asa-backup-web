/**
 * @fileoverview ARK ASA Backup Manager - Express/TypeScript Server
 *
 * **Architecture:** Domain-Driven Design with Dependency Injection
 *
 * Main entry point that:
 * 1. Initializes configuration and dependencies
 * 2. Creates domain-specific routes with injected config
 * 3. Registers routes with Express
 * 4. Starts background scheduler
 * 5. Handles graceful shutdown
 *
 * **Design Principles:**
 * - Domain-driven organization (backup, server, settings, etc.)
 * - Dependency injection for testability and flexibility
 * - Clear layer separation: Transport → Domain → Data-Access
 * - No circular dependencies
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import Dockerode from 'dockerode';

// Configuration
import {
  HTTP_SERVER_PORT,
  BACKUP_STORAGE_DIRECTORY,
  ARK_SAVE_DIRECTORY,
  DOCKER_DAEMON_SOCKET,
  ARK_SERVER_CONTAINER_NAME,
  CONTAINER_STOP_TIMEOUT_SECONDS,
  PROCESS_USER_ID,
  PROCESS_GROUP_ID,
  CONFIGURATION_FILE_PATH,
  DEFAULT_BACKUP_SETTINGS,
  MINIMUM_BACKUP_INTERVAL_SECONDS,
  MINIMUM_BACKUP_RETENTION_COUNT,
} from './config/constants.js';

// Utilities
import { Logger } from './utils/logger.js';
import { errorHandler } from './utils/errorHandler.js';

// Domain routes
import { createBackupRoutes } from './domains/backup/routes.js';
import { createArkServerRoutes } from './domains/arkServer/routes.js';
import { createSettingsRoutes } from './domains/settings/routes.js';
import { createHealthRoutes } from './domains/health/routes.js';
import { createStreamingRoutes } from './domains/streaming/routes.js';
import { createUnifiedStreamRoute } from './domains/streaming/unifiedStream.js';

// Domain services
import * as schedulerService from './domains/scheduler/service.js';
import * as systemService from './domains/system/service.js';

// Utilities
import { closeAllStreamConnections } from './utils/httpStream.js';

// ES Module __dirname equivalent
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);

// ============================================================================
// Dependency Injection Setup
// ============================================================================

/**
 * Backup domain configuration.
 * Injected into backup service and routes.
 */
const backupConfig = {
  backupDir: BACKUP_STORAGE_DIRECTORY,
  saveDir: ARK_SAVE_DIRECTORY,
  userId: PROCESS_USER_ID,
  groupId: PROCESS_GROUP_ID,
};

/**
 * Settings domain configuration.
 * Injected into settings service and routes.
 */
const settingsConfig = {
  configPath: CONFIGURATION_FILE_PATH,
  defaults: DEFAULT_BACKUP_SETTINGS,
  minInterval: MINIMUM_BACKUP_INTERVAL_SECONDS,
  minRetention: MINIMUM_BACKUP_RETENTION_COUNT,
};

/**
 * Docker/Server domain configuration.
 * Injected into server service and routes.
 */
const dockerConfig = {
  socketPath: DOCKER_DAEMON_SOCKET,
  containerName: ARK_SERVER_CONTAINER_NAME,
  stopTimeoutSeconds: CONTAINER_STOP_TIMEOUT_SECONDS,
};

const dockerClient = new Dockerode({ socketPath: dockerConfig.socketPath });

// ============================================================================
// Express Application Setup
// ============================================================================

const expressApplication = express();

// Middleware configuration
expressApplication.use(express.json());
expressApplication.use(express.urlencoded({ extended: true }));

// ============================================================================
// Domain Route Registration
// ============================================================================

// Register backup domain routes with injected config
expressApplication.use(
  createBackupRoutes(backupConfig, () =>
    import('./domains/settings/service.js').then((m) => m.loadSettings(settingsConfig))
  )
);

// Register settings domain routes with injected config
expressApplication.use(createSettingsRoutes(settingsConfig, backupConfig));

// Register ARK server domain routes with injected config
expressApplication.use(createArkServerRoutes(dockerClient, dockerConfig));

// Register health domain routes with injected dependencies
expressApplication.use(
  createHealthRoutes(
    {
      isActive: () => schedulerService.isSchedulerActive(),
      getLastSuccessfulTime: () => schedulerService.getLastSuccessfulBackupTime(),
      getLastFailedTime: () => schedulerService.getLastFailedBackupTime(),
      getLastError: () => schedulerService.getLastBackupError(),
    },
    {
      getDiskSpace: () => systemService.getDiskSpaceInfo(BACKUP_STORAGE_DIRECTORY),
      getVersion: () => systemService.getVersion(),
    }
  )
);

// Register streaming domain routes with injected config
expressApplication.use(
  createStreamingRoutes(dockerClient, ARK_SERVER_CONTAINER_NAME, backupConfig)
);

// Register unified streaming endpoint that multiplexes all data sources
expressApplication.use(
  createUnifiedStreamRoute(
    dockerClient,
    ARK_SERVER_CONTAINER_NAME,
    backupConfig,
    BACKUP_STORAGE_DIRECTORY
  )
);

// ============================================================================
// Static File Serving (React SPA)
// ============================================================================

/**
 * Serves React SPA for all unmatched routes.
 * MUST be last route to avoid overriding API endpoints.
 */
const staticFilesDirectory = path.join(currentDirectoryPath, '..', 'static', 'dist');
expressApplication.use(express.static(staticFilesDirectory));

expressApplication.get('*', (_httpRequest, httpResponse) => {
  httpResponse.sendFile(path.join(staticFilesDirectory, 'index.html'));
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Error handling middleware must be registered AFTER all other middleware and routes.
 * Catches errors thrown by route handlers and converts them to HTTP responses.
 */
expressApplication.use(errorHandler);

// ============================================================================
// HTTP Server Startup
// ============================================================================

const httpServer = expressApplication.listen(HTTP_SERVER_PORT, () => {
  Logger.info(`ARK ASA Backup Manager listening on port ${HTTP_SERVER_PORT}`);
  Logger.info(`Web interface: http://localhost:${HTTP_SERVER_PORT}`);
});

// ============================================================================
// Background Scheduler Startup
// ============================================================================

// Start automated backup scheduler loop with injected dependencies
schedulerService.runBackupSchedulerLoop(backupConfig, settingsConfig);

// ============================================================================
// Graceful Shutdown Handling
// ============================================================================

/**
 * Handles graceful shutdown on SIGTERM or SIGINT.
 * Stops scheduler, closes all HTTP streaming connections, and closes HTTP server cleanly.
 */
const handleGracefulShutdown = (signalName: string): void => {
  Logger.info(`\nReceived ${signalName} signal. Starting graceful shutdown...`);

  // Stop backup scheduler
  schedulerService.stopScheduler();

  // Close all active HTTP streaming connections to allow HTTP server to close
  Logger.info('Closing all HTTP streaming connections...');
  closeAllStreamConnections();

  // Close HTTP server
  httpServer.close(() => {
    Logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    Logger.error('Graceful shutdown timeout exceeded. Forcing exit...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
