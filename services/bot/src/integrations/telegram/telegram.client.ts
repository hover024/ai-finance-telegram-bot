import { config } from '../../config.js';
import { writeFile } from 'fs/promises';

const BASE_URL = `${config.telegram.apiUrl}/bot${config.telegram.botToken}`;

/**
 * Telegram API Client
 * Handles communication with Telegram Bot API
 */
class TelegramClient {
  /**
   * Get updates from Telegram using long polling
   */
  async getUpdates(offset: number | null = null): Promise<any[]> {
    const url = new URL(`${BASE_URL}/getUpdates`);
    const params: any = {
      timeout: 0,
      allowed_updates: [], // Empty array = receive all update types
    };

    if (offset !== null) {
      params.offset = offset;
    }

    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data.result || [];
  }

  /**
   * Get file path from Telegram for a file ID
   */
  async getFilePath(fileId: string): Promise<string> {
    const url = `${BASE_URL}/getFile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return data.result.file_path;
  }

  /**
   * Download file from Telegram and return as base64
   */
  async downloadFile(filePath: string): Promise<string> {
    const url = `${config.telegram.apiUrl}/file/bot${config.telegram.botToken}/${filePath}`;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  }

  /**
   * Download voice file from Telegram and save to disk
   */
  async downloadVoiceAsFile(filePath: string, outputPath: string): Promise<void> {
    const url = `${config.telegram.apiUrl}/file/bot${config.telegram.botToken}/${filePath}`;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(outputPath, buffer);
  }
}

// Singleton instance
export const telegramClient = new TelegramClient();
