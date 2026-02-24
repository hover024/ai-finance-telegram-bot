export interface TelegramMessage {
  updateId: number;
  messageId: number;
  text: string;
  hasPhoto: boolean;
  photoId: string | null;
  hasVoice: boolean;
  voiceId: string | null;
  voiceDuration: number | null;
  date: string;
}

export interface TransactionData {
  date: string;
  account: string;
  type: string;
  source: string;
  category: string;
  amount: number;
  currency: string;
  note: string;
}

export interface SheetAction {
  sheet: string;
  action: 'append';
  data: TransactionData;
}

export interface ProcessResult {
  success: boolean;
  messageId?: number;
  actions?: number;
  results?: unknown[];
  error?: string;
  reason?: string;
  queued?: boolean;
}

export interface ProcessStats {
  total: number;
  processed: number;
  failed: number;
  skipped: number;
}
