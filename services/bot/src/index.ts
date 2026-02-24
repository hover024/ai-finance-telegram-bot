#!/usr/bin/env node

import { validateConfig } from './config.js';
import { initSheetsClient } from './sheets.js';
import { startServer } from './server.js';
import { startPolling } from './polling.js';
import { logger } from './logger.js';

async function main() {
  logger.info('Personal Finance Bot starting');

  // Validate configuration
  try {
    validateConfig();
    logger.info('Configuration validated');
  } catch (error: any) {
    logger.error('Configuration error', { error: error.message });
    process.exit(1);
  }

  // Initialize Google Sheets client
  try {
    initSheetsClient();
    logger.info('Google Sheets client initialized');
  } catch (error: any) {
    logger.error('Google Sheets initialization failed', { error: error.message });
    process.exit(1);
  }

  // Start HTTP server (for webhook)
  try {
    startServer();
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }

  // Start periodic polling (backup mechanism)
  try {
    startPolling();
  } catch (error: any) {
    logger.error('Failed to start polling', { error: error.message });
    process.exit(1);
  }

  logger.info('All services started successfully');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Critical startup error', { error: error.message, stack: error.stack });
  process.exit(1);
});
