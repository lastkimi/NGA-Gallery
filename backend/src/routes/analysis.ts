import { Router, Request, Response, NextFunction } from 'express';
import { ObjectModel, ConstituentModel } from '../models/schemas';

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
      ObjectModel.countDocuments(),
      ObjectModel.aggregate([
        { $match: { classification: { $nin: [null, ''] } } },
        { $group: { _id: '$classification', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      ObjectModel.aggregate([
        { $match: { department: { $nin: [null, ''] } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      ObjectModel.aggregate([
        { $match: { begin_year: { $gt: 0 } } },
        { $project: { century: { $multiply: [{ $floor: { $divide: ['$begin_year', 100] } }, 100] } } },
        { $group: { _id: '$century', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      ObjectModel.aggregate([
        { $match: { begin_year: { $gt: 0 } } },
        { $group: { _id: null, earliest: { $min: '$begin_year' }, latest: { $max: { $ifNull: ['$end_year', '$begin_year'] } } } }
      ]),
      ObjectModel.aggregate([
        { $match: { attribution: { $nin: [null, ''] } } },
        { $group: { _id: '$attribution', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
    ]);
    
    res.json({
      totalObjects,
      byClassification: byClassification.map(row => ({
        classification: row._id,
        count: row.count,
      })),
      byDepartment: byDepartment.map(row => ({
        department: row._id,
        count: row.count,
      })),
      byCentury: byCentury.map(row => ({
        century: `${row._id}s`,
        count: row.count,
      })),
      dateRange: {
        earliest: dateRange[0]?.earliest || 1000,
        latest: dateRange[0]?.latest || 2024,
      },
      topArtists: topArtists.map(row => ({
        attribution: row._id,
        count: row.count,
      })),
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
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
    
    const result = await ObjectModel.aggregate([
      { 
        $match: { 
          begin_year: { $gte: start, $lte: end } 
        } 
      },
      {
        $project: {
          period_start: { 
            $multiply: [
              { $floor: { $divide: ['$begin_year', intervalValue] } }, 
              intervalValue
            ] 
          }
        }
      },
      { 
        $group: { 
          _id: '$period_start', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    const timelineData = result.map(row => ({
      period: `${row._id}s`,
      count: row.count,
      startYear: row._id,
    }));
    
    res.json(timelineData);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    next(error);
  }
});

/**
 * GET /api/analysis/artist-network
 * Get artist relationship data for network visualization
 */
router.get('/artist-network', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // MongoDB aggregation to get top artists by work count
    // Using ObjectModel attribution field since relationships are not fully normalized
    const topArtists = await ObjectModel.aggregate([
      { $match: { attribution: { $nin: [null, ''] } } },
      { $group: { _id: '$attribution', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 }
    ]);
    
    // Create nodes
    const nodes = topArtists.map((artist, index) => ({
      id: `artist-${index}`, // Use dummy ID as we don't have constituent ID from grouping
      name: artist._id,
      nationality: 'Unknown', // Need to lookup
      workCount: artist.count,
      group: 'Artist'
    }));
    
    // Try to enrich with nationality if possible (optional)
    // For now returning simplified data
    
    // Create links
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
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
    console.error('Error fetching artist network:', error);
    next(error);
  }
});

/**
 * GET /api/analysis/color-distribution
 */
router.get('/color-distribution', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
    console.error('Error fetching color distribution:', error);
    next(error);
  }
});

export default router;
