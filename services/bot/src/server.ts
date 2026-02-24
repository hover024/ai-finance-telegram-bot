import express, { Request, Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { parseUpdate } from './telegram.js';
import { processMessage } from './processor.js';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint for Telegram
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Validate secret token if configured
    if (config.server.webhookSecretToken) {
      const receivedToken = req.headers['x-telegram-bot-api-secret-token'];
      if (receivedToken !== config.server.webhookSecretToken) {
        logger.warn('Webhook request with invalid secret token', {
          receivedToken,
          ip: req.ip,
        });
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const update = req.body;

    if (!update || !update.update_id) {
      logger.warn('Invalid webhook payload received', { body: req.body });
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Acknowledge immediately
    res.status(200).json({ ok: true });

    // Process asynchronously
    const message = parseUpdate(update);
    if (message) {
      logger.info('Webhook message received', {
        updateId: update.update_id,
        messageId: message.messageId,
        hasPhoto: message.hasPhoto,
        hasVoice: message.hasVoice,
      });

      // Process without blocking response
      processMessage(message).catch((error) => {
        logger.error('Webhook message processing failed', {
          messageId: message.messageId,
          error: error.message,
        });
      });
    } else {
      logger.info('Webhook update without message', { updateId: update.update_id });
    }
  } catch (error: any) {
    logger.error('Webhook endpoint error', { error: error.message });
    // Don't send error response - already acknowledged
  }
});

export function startServer(): void {
  const port = config.server.port;

  app.listen(port, () => {
    logger.info('Server started', { port });
  });
}

export { app };
