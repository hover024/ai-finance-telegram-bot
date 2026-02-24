import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { ValidationError } from '../infrastructure/errors.js';

/**
 * Validate Telegram webhook payload
 */
export function validateWebhookPayload(req: Request, res: Response, next: NextFunction) {
  const update = req.body;

  if (!update || !update.update_id) {
    logger.warn('Invalid webhook payload received', { body: req.body });
    throw new ValidationError('Invalid payload');
  }

  next();
}

/**
 * Validate iOS Shortcuts request payload
 */
export function validateShortcutsPayload(req: Request, res: Response, next: NextFunction) {
  // If it's a file upload, multer will handle the file
  if (req.file) {
    return next();
  }

  // Otherwise, expect text in body
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    logger.warn('Invalid shortcuts payload received', { body: req.body });
    throw new ValidationError('Missing or invalid text field');
  }

  next();
}
