import type { Express } from 'express';
import healthRoute from './health.route.js';
import webhookRoute from './webhook.route.js';
import shortcutsRoute from './shortcuts.route.js';

/**
 * Register all routes with the Express app
 */
export function registerRoutes(app: Express): void {
  app.use(healthRoute);
  app.use(webhookRoute);
  app.use(shortcutsRoute);
}
