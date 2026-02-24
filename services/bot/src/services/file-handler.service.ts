import { telegramClient } from '../integrations/telegram/telegram.client.js';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { unlink, readFile } from 'fs/promises';
import { logger } from '../logger.js';
import { FileProcessingError } from '../infrastructure/errors.js';

/**
 * File Handler Service
 * Manages file downloads and cleanup
 */
class FileHandlerService {
  /**
   * Download photo from Telegram and return as base64
   * If photoId starts with /, treat it as a local file path (for Shortcuts)
   */
  async downloadPhoto(photoId: string): Promise<string> {
    try {
      // Check if it's a local file path (Shortcuts)
      if (photoId.startsWith('/')) {
        logger.info('Reading local photo file', { path: photoId });
        const buffer = await readFile(photoId);
        return buffer.toString('base64');
      }

      // Otherwise, download from Telegram
      logger.info('Downloading photo from Telegram', { photoId });
      const filePath = await telegramClient.getFilePath(photoId);
      const imageBase64 = await telegramClient.downloadFile(filePath);
      return imageBase64;
    } catch (error: any) {
      throw new FileProcessingError(`Failed to download photo: ${error.message}`);
    }
  }

  /**
   * Download voice message from Telegram and save to temp file
   * Returns the path to the saved file
   * If voiceId starts with /, treat it as a local file path (for Shortcuts)
   */
  async downloadVoice(voiceId: string): Promise<string> {
    try {
      // Check if it's a local file path (Shortcuts)
      if (voiceId.startsWith('/')) {
        logger.info('Using local voice file', { path: voiceId });
        return voiceId;
      }

      // Otherwise, download from Telegram
      logger.info('Downloading voice message from Telegram', { voiceId });
      const filePath = await telegramClient.getFilePath(voiceId);

      const tempFileName = `voice_${randomBytes(8).toString('hex')}.ogg`;
      const tempFilePath = join(process.cwd(), tempFileName);

      await telegramClient.downloadVoiceAsFile(filePath, tempFilePath);
      return tempFilePath;
    } catch (error: any) {
      throw new FileProcessingError(`Failed to download voice: ${error.message}`);
    }
  }

  /**
   * Save uploaded file to temp location
   * Used for iOS Shortcuts file uploads
   */
  async saveUploadedFile(file: Express.Multer.File): Promise<string> {
    try {
      logger.info('Saving uploaded file', {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      // File is already saved by multer, return the path
      return file.path;
    } catch (error: any) {
      throw new FileProcessingError(`Failed to save uploaded file: ${error.message}`);
    }
  }

  /**
   * Clean up temporary file
   */
  async cleanupFile(path: string): Promise<void> {
    try {
      await unlink(path);
      logger.info('Temp file cleaned up', { path });
    } catch (error: any) {
      logger.warn('Failed to cleanup temp file', { path, error: error.message });
    }
  }
}

// Singleton instance
export const fileHandlerService = new FileHandlerService();
