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
  whisper: {
    apiUrl: process.env.WHISPER_API_URL || 'http://whisper-service:8080',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    webhookUrl: process.env.WEBHOOK_URL,
    webhookSecretToken: process.env.WEBHOOK_SECRET_TOKEN,
    pollingInterval: parseInt(process.env.POLLING_INTERVAL || '300000'),
  },
  queue: {
    processInterval: parseInt(process.env.QUEUE_PROCESS_INTERVAL || '3600000'),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '5'),
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

  // Check for service account credentials (either env var or file)
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      readFileSync(config.googleSheets.serviceAccountPath);
    } catch {
      throw new Error(
        `Service account not configured. Either set GOOGLE_SERVICE_ACCOUNT env var or provide ${config.googleSheets.serviceAccountPath} file`
      );
    }
  }

  return true;
}
