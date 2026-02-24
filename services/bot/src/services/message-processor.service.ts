import { fileHandlerService } from './file-handler.service.js';
import { contentAnalyzerService } from './content-analyzer.service.js';
import { transactionService } from './transaction.service.js';
import { queueService } from './queue.service.js';
import { logger } from '../logger.js';
import { ClaudeApiError } from '../infrastructure/errors.js';
import type { TelegramMessage, ProcessResult, ProcessStats } from '../types.js';

/**
 * Message Processor Service
 * Main orchestrator for processing messages (text, photo, voice)
 * Replaces the old processor.ts with clean architecture
 */
class MessageProcessorService {
  /**
   * Process a single message
   */
  async processMessage(message: TelegramMessage): Promise<ProcessResult> {
    let messageType = 'Text';
    if (message.hasPhoto) messageType = 'Photo';
    if (message.hasVoice) messageType = 'Voice';

    logger.info('Processing message', {
      messageId: message.messageId,
      type: messageType,
      text: message.text || '(none)',
    });

    try {
      let actions;

      if (message.hasPhoto) {
        // Download and analyze photo
        const imageBase64 = await fileHandlerService.downloadPhoto(message.photoId!);
        actions = await contentAnalyzerService.analyzeImage(imageBase64, message.text);
      } else if (message.hasVoice) {
        // Download, transcribe and analyze voice
        const audioPath = await fileHandlerService.downloadVoice(message.voiceId!);
        actions = await contentAnalyzerService.analyzeVoice(audioPath);
      } else if (message.text) {
        // Analyze text directly
        actions = await contentAnalyzerService.analyzeText(message.text);
      } else {
        logger.info('No text, photo or voice, skipping', { messageId: message.messageId });
        return { success: false, reason: 'No text, photo or voice' };
      }

      logger.info('Claude returned actions', {
        messageId: message.messageId,
        actionCount: actions.length,
      });

      // Execute all actions
      const results = await transactionService.executeActions(actions);

      logger.info('Message processed successfully', { messageId: message.messageId });

      return {
        success: true,
        messageId: message.messageId,
        actions: actions.length,
        results,
      };
    } catch (error: any) {
      // Check if it's a Claude API error that suggests saving to queue
      const isClaudeApiError =
        error instanceof ClaudeApiError &&
        (error.status === 429 || // Rate limit
          error.status === 402 || // Payment required
          error.status === 529 || // Overloaded
          (error.message && error.message.includes('credit balance')));

      if (isClaudeApiError) {
        logger.warn('Claude API error, saving to queue', {
          messageId: message.messageId,
          error: error.message,
          status: error.status,
        });
        await queueService.enqueue(message);
        return {
          success: false,
          messageId: message.messageId,
          error: error.message,
          queued: true,
        };
      }

      logger.error('Message processing failed', {
        messageId: message.messageId,
        error: error.message,
      });
      return {
        success: false,
        messageId: message.messageId,
        error: error.message,
      };
    }
  }

  /**
   * Process multiple messages sequentially
   */
  async processMessages(messages: TelegramMessage[]): Promise<ProcessStats> {
    const stats: ProcessStats = {
      total: messages.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const message of messages) {
      const result = await this.processMessage(message);

      if (result.success === false) {
        if (result.reason === 'No text, photo or voice') {
          stats.skipped++;
        } else {
          stats.failed++;
        }
      } else {
        stats.processed++;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return stats;
  }
}

// Singleton instance
export const messageProcessorService = new MessageProcessorService();
