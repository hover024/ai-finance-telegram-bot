import { sheetsClient } from '../integrations/sheets/sheets.client.js';
import { logger } from '../logger.js';
import type { SheetAction } from '../types.js';

interface ExecutionResult {
  sheet: string;
  updatedRange?: string;
  updatedRows?: number;
  error?: string;
}

/**
 * Transaction Service
 * Executes financial transactions by writing to Google Sheets
 */
class TransactionService {
  /**
   * Execute multiple sheet actions
   */
  async executeActions(actions: SheetAction[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const action of actions) {
      const result = await this.executeAction(action);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute a single sheet action
   */
  async executeAction(action: SheetAction): Promise<ExecutionResult> {
    const { sheet, action: actionType, data } = action;

    logger.info('Executing action', { action: actionType, sheet });

    try {
      if (actionType === 'append') {
        const result = await sheetsClient.appendRow(sheet, data);

        if (data) {
          logger.info('Transaction recorded', {
            type: data.type,
            amount: data.amount,
            currency: data.currency,
            category: data.category,
          });
        }

        return result;
      }

      throw new Error(`Unknown action type: ${actionType}`);
    } catch (error: any) {
      logger.error('Action execution failed', {
        action: actionType,
        sheet,
        error: error.message,
      });
      return {
        sheet,
        error: error.message,
      };
    }
  }
}

// Singleton instance
export const transactionService = new TransactionService();
