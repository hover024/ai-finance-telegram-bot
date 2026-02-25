import { config } from '../config.js';
import { logger } from '../logger.js';
import { telegramClient } from '../integrations/telegram/telegram.client.js';
import { messageProcessorService } from '../services/message-processor.service.js';
import { storageService } from '../services/storage.service.js';
import type { TelegramMessage } from '../types.js';

const OFFSET_FILE = 'telegram-offset.txt';

/**
 * Parse Telegram update into normalized TelegramMessage format
 */
function parseUpdate(update: any): TelegramMessage | null {
  const message = update.message;

  if (!message) {
    return null;
  }

  // Log message details to debug shortcuts
  if (message.from) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        service: 'finance-bot',
        message: 'Parsing message',
        from_id: message.from.id,
        from_is_bot: message.from.is_bot,
        from_username: message.from.username,
        message_text: message.text || message.caption || '',
      })
    );
  }

  return {
    updateId: update.update_id,
    messageId: message.message_id,
    text: message.text || message.caption || '',
    hasPhoto: !!message.photo,
    photoId: message.photo ? message.photo[message.photo.length - 1].file_id : null,
    hasVoice: !!message.voice,
    voiceId: message.voice ? message.voice.file_id : null,
    voiceDuration: message.voice ? message.voice.duration : null,
    date: new Date(message.date * 1000).toISOString(),
  };
}

/**
 * Load the last processed update ID offset from GCS
 */
async function loadOffset(): Promise<number | null> {
  try {
    const content = await storageService.readFile(OFFSET_FILE);
    if (content) {
      const offset = parseInt(content.trim());
      return isNaN(offset) ? null : offset;
    }
  } catch (error: any) {
    logger.warn('Failed to read offset from storage', { error: error.message });
  }
  return null;
}

/**
 * Save the current update ID offset to GCS
 */
async function saveOffset(offset: number): Promise<void> {
  try {
    await storageService.writeFile(OFFSET_FILE, offset.toString());
  } catch (error: any) {
    logger.warn('Failed to save offset to storage', { error: error.message });
  }
}

/**
 * Poll Telegram for updates once
 */
async function pollOnce(): Promise<void> {
  try {
    const offset = await loadOffset();
    logger.info('Polling for updates', { offset: offset || 'start' });

    const updates = await telegramClient.getUpdates(offset);

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
          await messageProcessorService.processMessage(message);
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
    await saveOffset(newOffset);
    logger.info('Offset updated', { newOffset });
  } catch (error: any) {
    logger.error('Polling error', { error: error.message });
  }
}

/**
 * Start Telegram long polling
 */
export function startPolling(): void {
  const interval = config.server.pollingInterval;

  logger.info('Polling started', { intervalMs: interval });

  // Poll immediately on start
  pollOnce();

  // Then poll periodically
  setInterval(pollOnce, interval);
}
