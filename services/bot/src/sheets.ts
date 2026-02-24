import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { config } from './config.js';
import type { SheetAction, TransactionData } from './types.js';

let sheets: any;

export function initSheetsClient() {
  const serviceAccount = JSON.parse(
    readFileSync(config.googleSheets.serviceAccountPath, 'utf8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export async function appendRow(sheetName: string, data: TransactionData) {
  if (!sheets) {
    throw new Error('Sheets client not initialized');
  }

  if (sheetName !== 'Transactions') {
    throw new Error(`Unknown sheet: ${sheetName}`);
  }

  const getResponse = await sheets.spreadsheets.values.get({
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

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return {
    sheet: sheetName,
    updatedRange: response.data.updates.updatedRange,
    updatedRows: response.data.updates.updatedRows,
  };
}

export async function executeAction(action: SheetAction) {
  const { sheet, action: actionType, data } = action;

  if (actionType === 'append') {
    return await appendRow(sheet, data);
  }

  throw new Error(`Unknown action type: ${actionType}`);
}
