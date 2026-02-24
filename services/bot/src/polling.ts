import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';
import { getUpdates, parseUpdate } from './telegram.js';
import { processMessage } from './processor.js';

const OFFSET_FILE = '.telegram-offset';

function loadOffset(): number | null {
  try {
    if (existsSync(OFFSET_FILE)) {
      const offset = parseInt(readFileSync(OFFSET_FILE, 'utf8').trim());
      return isNaN(offset) ? null : offset;
    }
  } catch (error: any) {
    logger.warn('Failed to read offset file', { error: error.message });
  }
  return null;
}

function saveOffset(offset: number): void {
  try {
    writeFileSync(OFFSET_FILE, offset.toString());
  } catch (error: any) {
    logger.warn('Failed to save offset', { error: error.message });
  }
}

async function pollOnce(): Promise<void> {
  try {
    const offset = loadOffset();
    logger.info('Polling for updates', { offset: offset || 'start' });

    const updates = await getUpdates(offset);

    if (updates.length === 0) {
      logger.info('No new updates');
      return;
    }

    logger.info('Updates received', { count: updates.length });

    // Process messages sequentially
    for (const update of updates) {
      const message = parseUpdate(update);
      if (message) {
        try {
          await processMessage(message);
          logger.info('Message processed', {
            updateId: update.update_id,
            messageId: message.messageId,
          });
        } catch (error: any) {
          logger.error('Message processing failed', {
            updateId: update.update_id,
            messageId: message.messageId,
            error: error.message,
          });
        }
      }

      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Save new offset
    const lastUpdateId = updates[updates.length - 1].update_id;
    const newOffset = lastUpdateId + 1;
    saveOffset(newOffset);
    logger.info('Offset updated', { newOffset });
  } catch (error: any) {
    logger.error('Polling error', { error: error.message });
  }
}

export function startPolling(): void {
  const interval = config.server.pollingInterval;

  logger.info('Polling started', { intervalMs: interval });

  // Poll immediately on start
  pollOnce();

  // Then poll periodically
  setInterval(pollOnce, interval);
}
