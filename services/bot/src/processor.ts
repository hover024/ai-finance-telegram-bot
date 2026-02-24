import { getFilePath, downloadFile, downloadVoiceAsFile } from './telegram.js';
import { analyzeText, analyzeImage } from './claude.js';
import { executeAction } from './sheets.js';
import { transcribe } from './whisper.js';
import { logger } from './logger.js';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { TelegramMessage, ProcessResult, ProcessStats } from './types.js';

export async function processMessage(message: TelegramMessage): Promise<ProcessResult> {
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
      logger.info('Downloading photo', { messageId: message.messageId });
      const filePath = await getFilePath(message.photoId!);
      const imageBase64 = await downloadFile(filePath);

      logger.info('Sending to Claude Vision API', { messageId: message.messageId });
      actions = await analyzeImage(imageBase64, message.text);
    } else if (message.hasVoice) {
      logger.info('Downloading voice message', { messageId: message.messageId });
      const filePath = await getFilePath(message.voiceId!);

      const tempFileName = `voice_${randomBytes(8).toString('hex')}.ogg`;
      const tempFilePath = join(process.cwd(), tempFileName);

      await downloadVoiceAsFile(filePath, tempFilePath);

      logger.info('Transcribing via Whisper', { messageId: message.messageId });
      const transcribedText = await transcribe(tempFilePath);
      logger.info('Transcription complete', {
        messageId: message.messageId,
        text: transcribedText,
      });

      logger.info('Sending to Claude API', { messageId: message.messageId });
      actions = await analyzeText(transcribedText);
    } else if (message.text) {
      logger.info('Sending to Claude API', { messageId: message.messageId });
      actions = await analyzeText(message.text);
    } else {
      logger.info('No text, photo or voice, skipping', { messageId: message.messageId });
      return { success: false, reason: 'No text, photo or voice' };
    }

    logger.info('Claude returned actions', {
      messageId: message.messageId,
      actionCount: actions.length,
    });

    const results = [];
    for (const action of actions) {
      logger.info('Executing action', {
        messageId: message.messageId,
        action: action.action,
        sheet: action.sheet,
      });
      const result = await executeAction(action);
      results.push(result);

      if (action.action === 'append' && action.data) {
        logger.info('Transaction recorded', {
          messageId: message.messageId,
          type: action.data.type,
          amount: action.data.amount,
          currency: action.data.currency,
          category: action.data.category,
        });
      }
    }

    logger.info('Message processed successfully', { messageId: message.messageId });

    return {
      success: true,
      messageId: message.messageId,
      actions: actions.length,
      results,
    };
  } catch (error: any) {
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

export async function processMessages(messages: TelegramMessage[]): Promise<ProcessStats> {
  const stats: ProcessStats = {
    total: messages.length,
    processed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const message of messages) {
    const result = await processMessage(message);

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
