import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../models/database';

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
router.get('/ready', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check database connection
    await query('SELECT 1');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'disconnected',
      },
    });
  }
});

export default router;
