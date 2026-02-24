#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { validateConfig } from './config.js';
import { getUpdates, parseUpdate } from './telegram.js';
import { initSheetsClient } from './sheets.js';
import { processMessages } from './processor.js';

const OFFSET_FILE = '.telegram-offset';

function loadOffset(): number | null {
  try {
    if (existsSync(OFFSET_FILE)) {
      const offset = parseInt(readFileSync(OFFSET_FILE, 'utf8').trim());
      return isNaN(offset) ? null : offset;
    }
  } catch (error: any) {
    console.warn('⚠️  Failed to read offset:', error.message);
  }
  return null;
}

function saveOffset(offset: number): void {
  try {
    writeFileSync(OFFSET_FILE, offset.toString());
  } catch (error: any) {
    console.warn('⚠️  Failed to save offset:', error.message);
  }
}

async function main() {
  console.log('💰 Personal Finance Bot\n');

  try {
    validateConfig();
    console.log('✓ Config valid');
  } catch (error: any) {
    console.error('❌ Config error:', error.message);
    process.exit(1);
  }

  try {
    initSheetsClient();
    console.log('✓ Google Sheets client initialized');
  } catch (error: any) {
    console.error('❌ Google Sheets initialization error:', error.message);
    process.exit(1);
  }

  const offset = loadOffset();
  console.log(`✓ Offset: ${offset || 'start'}\n`);

  console.log('📡 Fetching new messages from Telegram...');

  let updates;
  try {
    updates = await getUpdates(offset);
    console.log(`✓ Received ${updates.length} new messages\n`);
  } catch (error: any) {
    console.error('❌ Error fetching messages:', error.message);
    process.exit(1);
  }

  if (updates.length === 0) {
    console.log('✓ No new messages');
    process.exit(0);
  }

  const messages = updates.map(parseUpdate).filter((msg) => msg !== null);
  console.log(`📋 To process: ${messages.length} messages\n`);

  const stats = await processMessages(messages);

  const lastUpdateId = updates[updates.length - 1].update_id;
  const newOffset = lastUpdateId + 1;
  saveOffset(newOffset);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Stats:');
  console.log(`   Total messages: ${stats.total}`);
  console.log(`   ✅ Processed: ${stats.processed}`);
  console.log(`   ⚠️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.failed}`);
  console.log(`   📍 New offset: ${newOffset}`);
  console.log('='.repeat(50));

  console.log('\n✅ Done!');
}

main().catch((error) => {
  console.error('\n💥 Critical error:', error);
  process.exit(1);
});
