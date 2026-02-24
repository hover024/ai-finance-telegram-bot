import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { config } from './config.js';
import type { SheetAction } from './types.js';

const anthropic = new Anthropic({
  apiKey: config.claude.apiKey,
});

function loadSystemPrompt(): string {
  const promptTemplate = readFileSync('prompt.txt', 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  return promptTemplate.replace('{{TODAY}}', today);
}

const SYSTEM_PROMPT = loadSystemPrompt();

export async function analyzeText(text: string): Promise<SheetAction[]> {
  const message = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  });

  return parseClaudeResponse(message);
}

export async function analyzeImage(
  imageBase64: string,
  caption: string = ''
): Promise<SheetAction[]> {
  const message = await anthropic.messages.create({
    model: config.claude.model,
    max_tokens: config.claude.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: caption || 'Распознай данные транзакции с этого чека/выписки.',
          },
        ],
      },
    ],
  });

  return parseClaudeResponse(message);
}

function parseClaudeResponse(message: any): SheetAction[] {
  const content = message.content[0].text;
  const jsonMatch = content.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error(`No JSON found in Claude response: ${content}`);
  }

  try {
    const actions = JSON.parse(jsonMatch[0]);
    return Array.isArray(actions) ? actions : [actions];
  } catch (error) {
    throw new Error(`Invalid JSON in Claude response: ${jsonMatch[0]}`);
  }
}
