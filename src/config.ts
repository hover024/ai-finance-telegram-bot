import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    apiUrl: 'https://api.telegram.org',
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY!,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4096,
  },
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    serviceAccountPath: './service-account.json',
  },
  accounts: {
    default: process.env.DEFAULT_ACCOUNT || 'Bank Account',
  },
};

export function validateConfig(): boolean {
  const required = [
    { key: 'TELEGRAM_BOT_TOKEN', value: config.telegram.botToken },
    { key: 'CLAUDE_API_KEY', value: config.claude.apiKey },
    { key: 'GOOGLE_SHEET_ID', value: config.googleSheets.spreadsheetId },
    { key: 'DEFAULT_ACCOUNT', value: config.accounts.default },
  ];

  for (const { key, value } of required) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  try {
    readFileSync(config.googleSheets.serviceAccountPath);
  } catch {
    throw new Error(`Service account file not found: ${config.googleSheets.serviceAccountPath}`);
  }

  return true;
}
