import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /health/ready
 * Readiness check (includes database)
 */
router.get('/ready', async (req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  
  if (state === 1) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
      },
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'disconnected',
        state,
      },
    });
  }
});

export default router;
