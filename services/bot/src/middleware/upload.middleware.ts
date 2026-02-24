import multer from 'multer';
import { logger } from '../logger.js';

/**
 * Multer configuration for file uploads
 * Accepts audio and image files up to 20MB
 */
export const uploadMiddleware = multer({
  dest: '/tmp',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      logger.warn('Invalid file type rejected', { mimetype: file.mimetype });
      cb(new Error('Invalid file type. Only audio and image files are allowed.'));
    }
  },
}).single('file');
