import { logger } from '../logger.js';
import { storageService } from './storage.service.js';
import type { TelegramMessage } from '../types.js';

const QUEUE_FILE = 'message-queue.json';

export interface QueuedMessage {
  message: TelegramMessage;
  timestamp: string;
  retries: number;
}

/**
 * Queue Service
 * Manages message queue for failed Claude API requests
 */
class QueueService {
  /**
   * Add a message to the queue
   */
  async enqueue(message: TelegramMessage): Promise<void> {
    try {
      let queue: QueuedMessage[] = [];

      const content = await storageService.readFile(QUEUE_FILE);
      if (content) {
        queue = JSON.parse(content);
      }

      queue.push({
        message,
        timestamp: new Date().toISOString(),
        retries: 0,
      });

      await storageService.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));

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

  /**
   * Get all messages in the queue
   */
  async getQueue(): Promise<QueuedMessage[]> {
    try {
      const content = await storageService.readFile(QUEUE_FILE);
      if (!content) {
        return [];
      }

      return JSON.parse(content);
    } catch (error: any) {
      logger.error('Failed to read queue', { error: error.message });
      return [];
    }
  }

  /**
   * Update the entire queue
   */
  async updateQueue(queue: QueuedMessage[]): Promise<void> {
    try {
      if (queue.length === 0) {
        // Write empty array if queue is empty
        await storageService.writeFile(QUEUE_FILE, '[]');
      } else {
        await storageService.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
      }
    } catch (error: any) {
      logger.error('Failed to update queue', { error: error.message });
    }
  }

  /**
   * Remove a message from the queue
   */
  async removeFromQueue(messageId: number): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newQueue = queue.filter((item) => item.message.messageId !== messageId);
      await this.updateQueue(newQueue);

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

  /**
   * Get the current size of the queue
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }
}

// Singleton instance
export const queueService = new QueueService();
