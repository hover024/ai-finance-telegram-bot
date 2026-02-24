import { config } from './config.js';
import { writeFile } from 'fs/promises';
import type { TelegramMessage } from './types.js';

const BASE_URL = `${config.telegram.apiUrl}/bot${config.telegram.botToken}`;

export async function getUpdates(offset: number | null = null): Promise<any[]> {
  const url = new URL(`${BASE_URL}/getUpdates`);
  const params: any = {
    timeout: 0,
    allowed_updates: [], // Empty array = receive all update types
  };

  if (offset !== null) {
    params.offset = offset;
  }

  url.search = new URLSearchParams(params);
  const response = await fetch(url);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result || [];
}

export async function getFilePath(fileId: string): Promise<string> {
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

export async function downloadFile(filePath: string): Promise<string> {
  const url = `${config.telegram.apiUrl}/file/bot${config.telegram.botToken}/${filePath}`;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function downloadVoiceAsFile(filePath: string, outputPath: string): Promise<void> {
  const url = `${config.telegram.apiUrl}/file/bot${config.telegram.botToken}/${filePath}`;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(outputPath, buffer);
}

export function parseUpdate(update: any): TelegramMessage | null {
  const message = update.message;

  if (!message) {
    return null;
  }

  // Log message details to debug shortcuts
  if (message.from) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'debug',
      service: 'finance-bot',
      message: 'Parsing message',
      from_id: message.from.id,
      from_is_bot: message.from.is_bot,
      from_username: message.from.username,
      message_text: message.text || message.caption || '',
    }));
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
