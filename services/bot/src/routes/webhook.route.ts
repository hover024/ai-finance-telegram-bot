import { Router } from 'express';
import { validateWebhookToken } from '../middleware/auth.middleware.js';
import { validateWebhookPayload } from '../middleware/validation.middleware.js';
import { handleWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.post('/webhook', validateWebhookToken, validateWebhookPayload, handleWebhook);

export default router;
