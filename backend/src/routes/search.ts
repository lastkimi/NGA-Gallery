import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../models/database';

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
    
    const searchTerm = `%${q}%`;
    const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    
    // Search query
    const result = await query(
      `SELECT * FROM objects 
       WHERE 
         title ILIKE $1 OR 
         attribution ILIKE $1 OR 
         medium ILIKE $1 OR
         display_date ILIKE $1
       ORDER BY id
       LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit as string, 10), offset]
    );
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM objects 
       WHERE 
         title ILIKE $1 OR 
         attribution ILIKE $1 OR 
         medium ILIKE $1 OR
         display_date ILIKE $1`,
      [searchTerm]
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string, 10)),
      },
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
    
    const searchTerm = `${q}%`;
    
    const result = await query(
      `SELECT DISTINCT title, attribution FROM objects 
       WHERE title ILIKE $1 OR attribution ILIKE $1
       ORDER BY title
       LIMIT $2`,
      [searchTerm, parseInt(limit as string, 10)]
    );
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
