import type { Request, Response } from 'express';
import { messageProcessorService } from '../services/message-processor.service.js';
import { logger } from '../logger.js';
import type { TelegramMessage } from '../types.js';

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
 * Handle Telegram webhook requests
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const update = req.body;

    // Acknowledge immediately
    res.status(200).json({ ok: true });

    // Process asynchronously
    const message = parseUpdate(update);
    if (message) {
      logger.info('Webhook message received', {
        updateId: update.update_id,
        messageId: message.messageId,
        hasPhoto: message.hasPhoto,
        hasVoice: message.hasVoice,
      });

      // Process without blocking response
      messageProcessorService.processMessage(message).catch((error) => {
        logger.error('Webhook message processing failed', {
          messageId: message.messageId,
          error: error.message,
        });
      });
    } else {
      logger.info('Webhook update without message', { updateId: update.update_id });
    }
  } catch (error: any) {
    logger.error('Webhook endpoint error', { error: error.message });
    // Don't send error response - already acknowledged
  }
}
