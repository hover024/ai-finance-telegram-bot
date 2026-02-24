import type { Request, Response } from 'express';
import { messageProcessorService } from '../services/message-processor.service.js';
import { logger } from '../logger.js';
import type { TelegramMessage } from '../types.js';

/**
 * Normalize text input to TelegramMessage format
 */
function normalizeTextToMessage(text: string): TelegramMessage {
  const messageId = Math.floor(Math.random() * 1000000);
  return {
    updateId: messageId,
    messageId,
    text: text.trim(),
    hasPhoto: false,
    photoId: null,
    hasVoice: false,
    voiceId: null,
    voiceDuration: null,
    date: new Date().toISOString(),
  };
}

/**
 * Normalize file upload to TelegramMessage format
 */
function normalizeFileToMessage(filePath: string, isAudio: boolean): TelegramMessage {
  const messageId = Math.floor(Math.random() * 1000000);

  if (isAudio) {
    return {
      updateId: messageId,
      messageId,
      text: '',
      hasPhoto: false,
      photoId: null,
      hasVoice: true,
      voiceId: filePath, // Use file path as ID for shortcuts
      voiceDuration: null,
      date: new Date().toISOString(),
    };
  } else {
    return {
      updateId: messageId,
      messageId,
      text: '',
      hasPhoto: true,
      photoId: filePath, // Use file path as ID for shortcuts
      hasVoice: false,
      voiceId: null,
      voiceDuration: null,
      date: new Date().toISOString(),
    };
  }
}

/**
 * Handle iOS Shortcuts message requests
 */
export async function handleShortcutsMessage(req: Request, res: Response) {
  try {
    let message: TelegramMessage;

    if (req.file) {
      // Handle file upload (voice/photo)
      const filePath = req.file.path;
      const isAudio = req.file.mimetype.startsWith('audio/');

      logger.info('Shortcuts file upload received', {
        mimetype: req.file.mimetype,
        size: req.file.size,
        isAudio,
      });

      message = normalizeFileToMessage(filePath, isAudio);
    } else {
      // Handle text input
      const { text } = req.body;

      logger.info('Shortcuts text received', { text });

      message = normalizeTextToMessage(text);
    }

    // Process message and wait for result
    const result = await messageProcessorService.processMessage(message);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        actions: result.actions,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || result.reason || 'Processing failed',
        queued: result.queued || false,
      });
    }
  } catch (error: any) {
    logger.error('Shortcuts request failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
