import { readFileSync, writeFileSync, existsSync } from 'fs';
import { logger } from './logger.js';
import type { TelegramMessage } from './types.js';

const QUEUE_FILE = 'message-queue.json';

interface QueuedMessage {
  message: TelegramMessage;
  timestamp: string;
  retries: number;
}

export function saveToQueue(message: TelegramMessage): void {
  try {
    let queue: QueuedMessage[] = [];

    if (existsSync(QUEUE_FILE)) {
      const content = readFileSync(QUEUE_FILE, 'utf-8');
      queue = JSON.parse(content);
    }

    queue.push({
      message,
      timestamp: new Date().toISOString(),
      retries: 0,
    });

    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

    logger.info('Message saved to queue', {
      messageId: message.messageId,
      queueSize: queue.length,
    });
  } catch (error: any) {
    logger.error('Failed to save message to queue', {
      messageId: message.messageId,
      error: error.message,
    });
  }
}

export function getQueue(): QueuedMessage[] {
  try {
    if (!existsSync(QUEUE_FILE)) {
      return [];
    }

    const content = readFileSync(QUEUE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    logger.error('Failed to read queue', { error: error.message });
    return [];
  }
}

export function updateQueue(queue: QueuedMessage[]): void {
  try {
    if (queue.length === 0) {
      // Remove queue file if empty
      if (existsSync(QUEUE_FILE)) {
        writeFileSync(QUEUE_FILE, '[]');
      }
    } else {
      writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    }
  } catch (error: any) {
    logger.error('Failed to update queue', { error: error.message });
  }
}

export function removeFromQueue(messageId: number): void {
  try {
    const queue = getQueue();
    const newQueue = queue.filter((item) => item.message.messageId !== messageId);
    updateQueue(newQueue);

    logger.info('Message removed from queue', {
      messageId,
      remainingInQueue: newQueue.length,
    });
  } catch (error: any) {
    logger.error('Failed to remove message from queue', {
      messageId,
      error: error.message,
    });
  }
}

export function getQueueSize(): number {
  return getQueue().length;
}
