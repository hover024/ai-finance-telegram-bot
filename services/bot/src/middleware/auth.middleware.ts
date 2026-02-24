import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { AuthenticationError } from '../infrastructure/errors.js';

/**
 * Validate Telegram webhook secret token
 */
export function validateWebhookToken(req: Request, res: Response, next: NextFunction) {
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
  next();
}

/**
 * Validate iOS Shortcuts API key
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  if (!config.server.shortcutsApiKey) {
    logger.error('Shortcuts API key not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  const receivedKey = req.headers['x-api-key'];
  if (receivedKey !== config.server.shortcutsApiKey) {
    logger.warn('Shortcuts request with invalid API key', {
      receivedKey,
      ip: req.ip,
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
