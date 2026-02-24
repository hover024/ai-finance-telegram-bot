import type { Request, Response } from 'express';

/**
 * Health check endpoint
 */
export async function handleHealthCheck(req: Request, res: Response) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
