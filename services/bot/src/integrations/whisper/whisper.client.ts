import { unlink, readFile } from 'fs/promises';
import { FormData, File } from 'undici';
import { GoogleAuth } from 'google-auth-library';
import { config } from '../../config.js';
import { logger } from '../../logger.js';
import { FileProcessingError } from '../../infrastructure/errors.js';

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000;

// Google Auth client for Cloud Run service-to-service authentication
const auth = new GoogleAuth();

/**
 * Whisper API Client
 * Handles audio transcription using local Whisper service
 */
class WhisperClient {
  /**
   * Transcribe audio file to text
   * Automatically cleans up the file after transcription
   */
  async transcribe(audioPath: string): Promise<string> {
    try {
      const text = await this.transcribeWithRetry(audioPath);
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

  /**
   * Transcribe with automatic retry logic
   */
  private async transcribeWithRetry(audioPath: string, attempt: number = 1): Promise<string> {
    try {
      // Read audio file
      const audioBuffer = await readFile(audioPath);
      const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

      // Create form data
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('response_format', 'json');

      // Get identity token for service-to-service authentication
      const client = await auth.getIdTokenClient(config.whisper.apiUrl);
      const idToken = await client.idTokenProvider.fetchIdToken(config.whisper.apiUrl);

      // Make HTTP request to Whisper API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(`${config.whisper.apiUrl}/inference`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData as any,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new FileProcessingError(
            `Whisper API error: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();

        if (!result.text) {
          throw new FileProcessingError(
            'Whisper API returned invalid response: missing text field'
          );
        }

        return result.text;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new FileProcessingError(`Whisper API timeout after ${TIMEOUT_MS}ms`);
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
        return this.transcribeWithRetry(audioPath, attempt + 1);
      }

      throw new FileProcessingError(
        `Whisper transcription failed after ${MAX_RETRIES} attempts: ${error.message}`
      );
    }
  }
}

// Singleton instance
export const whisperClient = new WhisperClient();
