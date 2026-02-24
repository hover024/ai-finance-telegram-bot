import { Router } from 'express';
import { validateApiKey } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import { validateShortcutsPayload } from '../middleware/validation.middleware.js';
import { handleShortcutsMessage } from '../controllers/shortcuts.controller.js';

const router = Router();

router.post(
  '/api/message',
  validateApiKey,
  uploadMiddleware,
  validateShortcutsPayload,
  handleShortcutsMessage
);

export default router;
