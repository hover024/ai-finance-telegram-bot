import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { config } from '../../config.js';
import { SheetsError } from '../../infrastructure/errors.js';
import type { TransactionData } from '../../types.js';

/**
 * Google Sheets API Client
 * Handles communication with Google Sheets for data storage
 */
class SheetsClient {
  private sheets: any;

  /**
   * Initialize the Google Sheets client with service account credentials
   */
  init() {
    // Try to get credentials from environment variable first (for deployment)
    // If not found, fall back to file (for local development)
    let serviceAccount;

    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = JSON.parse(
        readFileSync(config.googleSheets.serviceAccountPath, 'utf8')
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }

  /**
   * Append a transaction row to the specified sheet
   */
  async appendRow(sheetName: string, data: TransactionData) {
    if (!this.sheets) {
      throw new SheetsError('Sheets client not initialized');
    }

    if (sheetName !== 'Transactions') {
      throw new SheetsError(`Unknown sheet: ${sheetName}`);
    }

    try {
      const getResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `${sheetName}!A:A`,
      });

      const rowCount = (getResponse.data.values?.length || 0) + 1;
      const amountPlnFormula = `=IF(G${rowCount}="PLN";F${rowCount};IF(G${rowCount}="USD";F${rowCount}*Dashboard!$B$4;F${rowCount}))`;

      const values = [
        [
          data.date,
          data.account || config.accounts.default,
          data.type,
          data.source,
          data.category,
          Math.abs(data.amount),
          data.currency,
          amountPlnFormula,
          data.note || '',
        ],
      ];

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      // Copy formatting from previous row
      if (rowCount > 2) {
        await this.copyFormattingFromPreviousRow(sheetName, rowCount);
      }

      return {
        sheet: sheetName,
        updatedRange: response.data.updates.updatedRange,
        updatedRows: response.data.updates.updatedRows,
      };
    } catch (error: any) {
      throw new SheetsError(`Failed to append row: ${error.message}`);
    }
  }

  /**
   * Copy formatting from the previous row to maintain consistent styling
   */
  private async copyFormattingFromPreviousRow(sheetName: string, rowCount: number) {
    try {
      // Get sheet ID
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
      });
      const sheet = sheetMetadata.data.sheets.find(
        (s: any) => s.properties.title === sheetName
      );
      const sheetId = sheet?.properties.sheetId;

      if (sheetId !== undefined) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.googleSheets.spreadsheetId,
          requestBody: {
            requests: [
              {
                copyPaste: {
                  source: {
                    sheetId,
                    startRowIndex: rowCount - 2,
                    endRowIndex: rowCount - 1,
                    startColumnIndex: 0,
                    endColumnIndex: 9,
                  },
                  destination: {
                    sheetId,
                    startRowIndex: rowCount - 1,
                    endRowIndex: rowCount,
                    startColumnIndex: 0,
                    endColumnIndex: 9,
                  },
                  pasteType: 'PASTE_FORMAT',
                },
              },
            ],
          },
        });
      }
    } catch (error: any) {
      // Don't fail the entire operation if formatting fails
      console.warn('Failed to copy formatting:', error.message);
    }
  }
}

// Singleton instance
export const sheetsClient = new SheetsClient();
