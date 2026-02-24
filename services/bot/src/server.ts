import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.middleware.js';

const app = express();

// Middleware
app.use(express.json());

// Register all routes
registerRoutes(app);

// Global error handler (must be last)
app.use(errorHandler);

/**
 * Start the Express server
 */
export function startServer(): void {
  const port = config.server.port;

  app.listen(port, () => {
    logger.info('Server started', { port });
  });
}

export { app };
