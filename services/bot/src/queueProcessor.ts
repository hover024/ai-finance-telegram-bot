import { logger } from './logger.js';
import { config } from './config.js';
import { getQueue, updateQueue, getQueueSize } from './queue.js';
import { processMessage } from './processor.js';

export async function processQueuedMessages(): Promise<void> {
  const queue = getQueue();

  if (queue.length === 0) {
    return;
  }

  logger.info('Processing queued messages', { queueSize: queue.length });

  const updatedQueue = [];

  for (const item of queue) {
    try {
      logger.info('Retrying queued message', {
        messageId: item.message.messageId,
        retries: item.retries,
      });

      const result = await processMessage(item.message);

      if (result.success) {
        logger.info('Queued message processed successfully', {
          messageId: item.message.messageId,
        });
        // Don't add back to queue - successfully processed
        continue;
      }

      // If still failing and not queued again, increment retry counter
      if (!result.queued) {
        logger.warn('Queued message still failing', {
          messageId: item.message.messageId,
          error: result.error,
        });

        if (item.retries < config.queue.maxRetries) {
          updatedQueue.push({
            ...item,
            retries: item.retries + 1,
          });
        } else {
          logger.error('Max retries reached, dropping message', {
            messageId: item.message.messageId,
          });
        }
      } else {
        // If queued again (Claude still unavailable), keep in queue
        updatedQueue.push(item);
      }
    } catch (error: any) {
      logger.error('Error processing queued message', {
        messageId: item.message.messageId,
        error: error.message,
      });

      if (item.retries < config.queue.maxRetries) {
        updatedQueue.push({
          ...item,
          retries: item.retries + 1,
        });
      }
    }

    // Small delay between messages
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  updateQueue(updatedQueue);

  logger.info('Queue processing complete', {
    processed: queue.length - updatedQueue.length,
    remaining: updatedQueue.length,
  });
}

export function startQueueProcessor(): void {
  logger.info('Queue processor started', {
    intervalMs: config.queue.processInterval,
    maxRetries: config.queue.maxRetries,
  });

  // Process queue immediately on start
  const initialQueueSize = getQueueSize();
  if (initialQueueSize > 0) {
    logger.info('Found queued messages on startup', { count: initialQueueSize });
    processQueuedMessages().catch((error) => {
      logger.error('Failed to process initial queue', { error: error.message });
    });
  }

  // Then process periodically
  setInterval(() => {
    processQueuedMessages().catch((error) => {
      logger.error('Failed to process queue', { error: error.message });
    });
  }, config.queue.processInterval);
}
