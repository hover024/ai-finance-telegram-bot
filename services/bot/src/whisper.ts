import { unlink, readFile } from 'fs/promises';
import { FormData, File } from 'undici';
import { config } from './config.js';
import { logger } from './logger.js';

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

async function transcribeWithRetry(
  audioPath: string,
  attempt: number = 1
): Promise<string> {
  try {
    // Read audio file
    const audioBuffer = await readFile(audioPath);
    const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('response_format', 'json');

    // Make HTTP request to Whisper API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${config.whisper.apiUrl}/inference`, {
        method: 'POST',
        body: formData as any,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Whisper API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.text) {
        throw new Error('Whisper API returned invalid response: missing text field');
      }

      return result.text;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Whisper API timeout after ${TIMEOUT_MS}ms`);
      }

      throw error;
    }
  } catch (error: any) {
    if (attempt < MAX_RETRIES) {
      logger.warn('Whisper transcription attempt failed, retrying', {
        attempt,
        maxRetries: MAX_RETRIES,
        error: error.message,
      });
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      return transcribeWithRetry(audioPath, attempt + 1);
    }

    throw new Error(`Whisper transcription failed after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

export async function transcribe(audioPath: string): Promise<string> {
  try {
    const text = await transcribeWithRetry(audioPath);
    return text;
  } finally {
    // Always cleanup temp file
    try {
      await unlink(audioPath);
    } catch (error: any) {
      logger.warn('Failed to delete temp audio file', {
        path: audioPath,
        error: error.message,
      });
    }
  }
}
