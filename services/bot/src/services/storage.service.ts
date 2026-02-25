import { Storage } from '@google-cloud/storage';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Storage Service
 * Provides persistent storage for offset and queue using Google Cloud Storage
 * Replaces local file system storage to work with Cloud Run ephemeral containers
 */
class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage();
    this.bucketName = config.storage.bucketName;
  }

  /**
   * Read text file from GCS
   */
  async readFile(fileName: string): Promise<string | null> {
    try {
      const file = this.storage.bucket(this.bucketName).file(fileName);
      const [exists] = await file.exists();

      if (!exists) {
        return null;
      }

      const [contents] = await file.download();
      return contents.toString('utf-8');
    } catch (error: any) {
      logger.warn('Failed to read file from GCS', { fileName, error: error.message });
      return null;
    }
  }

  /**
   * Write text file to GCS
   */
  async writeFile(fileName: string, content: string): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucketName).file(fileName);
      await file.save(content, {
        contentType: 'text/plain',
        metadata: {
          cacheControl: 'no-cache',
        },
      });
    } catch (error: any) {
      logger.error('Failed to write file to GCS', { fileName, error: error.message });
      throw error;
    }
  }

  /**
   * Delete file from GCS
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucketName).file(fileName);
      await file.delete();
    } catch (error: any) {
      logger.warn('Failed to delete file from GCS', { fileName, error: error.message });
    }
  }

  /**
   * Check if file exists in GCS
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const file = this.storage.bucket(this.bucketName).file(fileName);
      const [exists] = await file.exists();
      return exists;
    } catch (error: any) {
      logger.warn('Failed to check file existence in GCS', { fileName, error: error.message });
      return false;
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
