import { getFilePath, downloadFile, downloadVoiceAsFile } from './telegram.js';
import { analyzeText, analyzeImage } from './claude.js';
import { executeAction } from './sheets.js';
import { transcribe } from './whisper.js';
import { join } from 'path';
import { randomBytes } from 'crypto';
import type { TelegramMessage, ProcessResult, ProcessStats } from './types.js';

export async function processMessage(message: TelegramMessage): Promise<ProcessResult> {
  console.log(`\n📨 Processing message ${message.messageId}`);

  let messageType = 'Text';
  if (message.hasPhoto) messageType = 'Photo';
  if (message.hasVoice) messageType = 'Voice';

  console.log(`   Type: ${messageType}`);
  console.log(`   Text: ${message.text || '(none)'}`);

  try {
    let actions;

    if (message.hasPhoto) {
      console.log('   📸 Downloading photo...');
      const filePath = await getFilePath(message.photoId!);
      const imageBase64 = await downloadFile(filePath);

      console.log('   🤖 Sending to Claude Vision API...');
      actions = await analyzeImage(imageBase64, message.text);
    } else if (message.hasVoice) {
      console.log('   🎤 Downloading voice message...');
      const filePath = await getFilePath(message.voiceId!);

      const tempFileName = `voice_${randomBytes(8).toString('hex')}.ogg`;
      const tempFilePath = join(process.cwd(), tempFileName);

      await downloadVoiceAsFile(filePath, tempFilePath);

      console.log('   🗣️  Transcribing via Whisper...');
      const transcribedText = await transcribe(tempFilePath);
      console.log(`   📝 Recognized: "${transcribedText}"`);

      console.log('   🤖 Sending to Claude API...');
      actions = await analyzeText(transcribedText);
    } else if (message.text) {
      console.log('   🤖 Sending to Claude API...');
      actions = await analyzeText(message.text);
    } else {
      console.log('   ⚠️  No text, photo or voice, skipping');
      return { success: false, reason: 'No text, photo or voice' };
    }

    console.log(`   ✓ Claude returned ${actions.length} actions`);

    const results = [];
    for (const action of actions) {
      console.log(`   📝 Executing: ${action.action} in ${action.sheet}`);
      const result = await executeAction(action);
      results.push(result);

      if (action.action === 'append' && action.data) {
        console.log(
          `      ✓ ${action.data.type}: ${action.data.amount} ${action.data.currency} - ${action.data.category}`
        );
      }
    }

    console.log('   ✅ Successfully processed');

    return {
      success: true,
      messageId: message.messageId,
      actions: actions.length,
      results,
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      success: false,
      messageId: message.messageId,
      error: error.message,
    };
  }
}

export async function processMessages(messages: TelegramMessage[]): Promise<ProcessStats> {
  const stats: ProcessStats = {
    total: messages.length,
    processed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const message of messages) {
    const result = await processMessage(message);

    if (result.success === false) {
      if (result.reason === 'No text, photo or voice') {
        stats.skipped++;
      } else {
        stats.failed++;
      }
    } else {
      stats.processed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return stats;
}
