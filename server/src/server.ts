/**
 * @fileoverview ARK ASA Backup Manager - Express/TypeScript Server (Refactored)
 * Main entry point for the backup management application.
 * Coordinates services, routes, and background scheduler.
 *
 * Architecture:
 * - Modular design with separation of concerns
 * - Services handle business logic and data operations
 * - Routes handle HTTP request/response
 * - Utilities provide reusable helpers
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { HTTP_SERVER_PORT } from './config/constants.js';
import { Logger } from './utils/logger.js';

// ES Module __dirname equivalent for server.ts location
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);

// Import route modules
import healthRouter from './routes/healthRoutes.js';
import settingsRouter from './routes/settingsRoutes.js';
import backupRouter from './routes/backupRoutes.js';
import serverRouter from './routes/serverRoutes.js';
import streamRouter from './routes/streamRoutes.js';

// Import services
import { runBackupSchedulerLoop, stopScheduler } from './services/schedulerService.js';
import { closeAllStreamConnections } from './utils/httpStream.js';
import { errorHandler } from './utils/errorHandler.js';

// ============================================================================
// Express Application Setup
// ============================================================================

const expressApplication = express();

// Middleware configuration
expressApplication.use(express.json());
expressApplication.use(express.urlencoded({ extended: true }));

// ============================================================================
// Route Registration
// ============================================================================

// Health and monitoring routes
expressApplication.use(healthRouter);

// Settings management routes
expressApplication.use(settingsRouter);

// Backup CRUD routes
expressApplication.use(backupRouter);

// Docker server control routes
expressApplication.use(serverRouter);

// HTTP streaming and restore routes
expressApplication.use(streamRouter);

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

// Start automated backup scheduler loop
runBackupSchedulerLoop();

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
  stopScheduler();

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
