import { Router, Request, Response, NextFunction } from 'express';
import { objectsService } from '../services/objects';
import { ObjectModel } from '../models/schemas';

const router = Router();

/**
 * GET /api/search
 * Full-text search across objects
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, page = '1', limit = '20' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const result = await objectsService.getObjects({
      search: q as string
    }, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10)
    });
    
    res.json({
      data: result.data,
      pagination: result.pagination,
      query: q,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions (autocomplete)
 */
router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit = '10' } = req.query;
    
    if (!q) {
      return res.json([]);
    }
    
    const regex = new RegExp(`^${q}`, 'i'); // Starts with
    
    const results = await ObjectModel.find({
      $or: [
        { title: regex },
        { attribution: regex }
      ]
    })
    .select('title attribution')
    .limit(parseInt(limit as string, 10));
    
    // Format to match previous SQL output structure
    res.json(results.map(r => ({ title: r.title, attribution: r.attribution })));
  } catch (error) {
    next(error);
  }
});

export default router;
