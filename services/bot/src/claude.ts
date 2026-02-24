import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { config } from './config.js';
import type { SheetAction } from './types.js';

const anthropic = new Anthropic({
  apiKey: config.claude.apiKey,
});

function loadSystemPrompt(): string {
  // Try to get prompt from environment variable first (for deployment)
  // If not found, fall back to file (for local development)
  let promptTemplate: string;

  if (process.env.SYSTEM_PROMPT) {
    promptTemplate = process.env.SYSTEM_PROMPT;
  } else if (existsSync('prompt.txt')) {
    promptTemplate = readFileSync('prompt.txt', 'utf-8');
  } else {
    throw new Error(
      'System prompt not configured. Either set SYSTEM_PROMPT env var or provide prompt.txt file'
    );
  }

  const today = new Date().toISOString().split('T')[0];
  return promptTemplate.replace('{{TODAY}}', today);
}

function loadVisionPrompt(): string {
  // Try to get prompt from environment variable first (for deployment)
  // If not found, fall back to file (for local development)
  if (process.env.VISION_PROMPT) {
    return process.env.VISION_PROMPT.trim();
  } else if (existsSync('vision.txt')) {
    return readFileSync('vision.txt', 'utf-8').trim();
  } else {
    throw new Error(
      'Vision prompt not configured. Either set VISION_PROMPT env var or provide vision.txt file'
    );
  }
}

const SYSTEM_PROMPT = loadSystemPrompt();
const VISION_PROMPT = loadVisionPrompt();

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
            text: caption || VISION_PROMPT,
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
