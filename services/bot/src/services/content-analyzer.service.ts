import { claudeClient } from '../integrations/claude/claude.client.js';
import { whisperClient } from '../integrations/whisper/whisper.client.js';
import { logger } from '../logger.js';
import type { SheetAction } from '../types.js';

/**
 * Content Analyzer Service
 * Analyzes different types of content (text, image, voice) to extract financial transactions
 */
class ContentAnalyzerService {
  /**
   * Analyze text message and extract financial actions
   */
  async analyzeText(text: string): Promise<SheetAction[]> {
    logger.info('Analyzing text with Claude');
    const actions = await claudeClient.analyzeText(text);
    logger.info('Text analysis complete', { actionCount: actions.length });
    return actions;
  }

  /**
   * Analyze image and extract financial actions
   */
  async analyzeImage(imageBase64: string, caption?: string): Promise<SheetAction[]> {
    logger.info('Analyzing image with Claude Vision');
    const actions = await claudeClient.analyzeImage(imageBase64, caption);
    logger.info('Image analysis complete', { actionCount: actions.length });
    return actions;
  }

  /**
   * Transcribe voice message and extract financial actions
   */
  async analyzeVoice(audioPath: string): Promise<SheetAction[]> {
    logger.info('Transcribing audio with Whisper');
    const transcribedText = await whisperClient.transcribe(audioPath);
    logger.info('Transcription complete', { text: transcribedText });

    logger.info('Analyzing transcribed text with Claude');
    const actions = await claudeClient.analyzeText(transcribedText);
    logger.info('Voice analysis complete', { actionCount: actions.length });
    return actions;
  }
}

// Singleton instance
export const contentAnalyzerService = new ContentAnalyzerService();
