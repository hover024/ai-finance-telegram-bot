import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import {
  ValidationError,
  AuthenticationError,
  ClaudeApiError,
  FileProcessingError,
  SheetsError,
} from '../infrastructure/errors.js';

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns appropriate responses
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({ error: err.message });
  }

  if (err instanceof ClaudeApiError) {
    return res.status(503).json({ error: 'AI service temporarily unavailable' });
  }

  if (err instanceof FileProcessingError) {
    return res.status(422).json({ error: 'File processing failed' });
  }

  if (err instanceof SheetsError) {
    return res.status(503).json({ error: 'Database service temporarily unavailable' });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 20MB.' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
