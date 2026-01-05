import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../models/database';

const router = Router();

/**
 * GET /api/analysis/statistics
 * Get collection statistics
 */
router.get('/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalObjects,
      byClassification,
      byDepartment,
      byCentury,
      dateRange,
      topArtists,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM objects'),
      query(`
        SELECT classification, COUNT(*) as count 
        FROM objects 
        WHERE classification IS NOT NULL 
        GROUP BY classification 
        ORDER BY count DESC
        LIMIT 20
      `),
      query(`
        SELECT department, COUNT(*) as count 
        FROM objects 
        WHERE department IS NOT NULL 
        GROUP BY department 
        ORDER BY count DESC
      `),
      query(`
        SELECT 
          FLOOR(begin_year / 100) * 100 as century,
          COUNT(*) as count 
        FROM objects 
        WHERE begin_year IS NOT NULL AND begin_year > 0
        GROUP BY FLOOR(begin_year / 100) * 100
        ORDER BY century
      `),
      query(`
        SELECT 
          MIN(begin_year) as earliest,
          MAX(end_year) as latest
        FROM objects 
        WHERE begin_year IS NOT NULL AND begin_year > 0
      `),
      query(`
        SELECT attribution, COUNT(*) as count 
        FROM objects 
        WHERE attribution IS NOT NULL AND attribution != ''
        GROUP BY attribution 
        ORDER BY count DESC
        LIMIT 20
      `),
    ]);
    
    res.json({
      totalObjects: parseInt(totalObjects.rows[0].count, 10),
      byClassification: byClassification.rows,
      byDepartment: byDepartment.rows,
      byCentury: byCentury.rows.map(row => ({
        century: `${row.century}s`,
        count: parseInt(row.count, 10),
      })),
      dateRange: {
        earliest: parseInt(dateRange.rows[0].earliest, 10),
        latest: parseInt(dateRange.rows[0].latest, 10),
      },
      topArtists: topArtists.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analysis/timeline
 * Get timeline data for visualization
 */
router.get('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startYear, endYear, interval = 'decade' } = req.query;
    
    let intervalValue = 10; // decades
    if (interval === 'century') intervalValue = 100;
    else if (interval === 'year') intervalValue = 1;
    
    const start = startYear ? parseInt(startYear as string, 10) : 1000;
    const end = endYear ? parseInt(endYear as string, 10) : 2024;
    
    const result = await query(
      `SELECT 
        FLOOR(begin_year / $1) * $1 as period_start,
        COUNT(*) as count
       FROM objects 
       WHERE begin_year IS NOT NULL 
         AND begin_year >= $2 
         AND begin_year <= $3
       GROUP BY FLOOR(begin_year / $1) * $1
       ORDER BY period_start`,
      [intervalValue, start, end]
    );
    
    res.json(result.rows.map(row => ({
      period: `${row.period_start}s`,
      count: parseInt(row.count, 10),
      startYear: parseInt(row.period_start, 10),
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analysis/artist-network
 * Get artist relationship data for network visualization
 */
router.get('/artist-network', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get artists with their work counts
    const artistsResult = await query(
      `SELECT 
         id,
         constituent_id,
         preferred_name,
         nationality,
         begin_year,
         end_year,
         (SELECT COUNT(*) FROM objects o WHERE o.attribution ILIKE '%' || c.preferred_name || '%') as work_count
       FROM constituents c
       WHERE is_artist = true
       ORDER BY work_count DESC
       LIMIT 100`
    );
    
    // Create nodes and links for network graph
    const nodes = artistsResult.rows.map((artist, index) => ({
      id: artist.constituent_id,
      name: artist.preferred_name,
      nationality: artist.nationality,
      workCount: parseInt(artist.work_count, 10),
      group: artist.nationality || 'Unknown',
    }));
    
    // Create links (simplified - in reality would need more complex logic)
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      // Connect top artists to each other as a simplified network
      if (i < 20) {
        links.push({
          source: nodes[i].id,
          target: nodes[i + 1].id,
          value: 1,
        });
      }
    }
    
    res.json({
      nodes,
      links,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analysis/color-distribution
 * Get color distribution data (placeholder - would need image processing)
 */
router.get('/color-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Placeholder data - in production this would analyze actual images
    res.json({
      description: 'Color analysis would require processing all images',
      averageDominantColors: [
        { color: 'Brown', percentage: 25 },
        { color: 'Blue', percentage: 20 },
        { color: 'Green', percentage: 15 },
        { color: 'Red', percentage: 12 },
        { color: 'Gold', percentage: 10 },
      ],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
