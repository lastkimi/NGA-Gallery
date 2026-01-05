import { Router, Request, Response, NextFunction } from 'express';
import { objectsService } from '../services/objects';
import { ApiError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/objects
 * Get list of objects with filters and pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      classification,
      department,
      artist,
      beginYear,
      endYear,
      medium,
      page = '1',
      limit = '20',
      sortBy = 'id',
      sortOrder = 'asc',
    } = req.query;
    
    const filters = {
      search: search as string,
      classification: classification as string,
      department: department as string,
      artist: artist as string,
      beginYear: beginYear ? parseInt(beginYear as string, 10) : undefined,
      endYear: endYear ? parseInt(endYear as string, 10) : undefined,
      medium: medium as string,
    };
    
    const pagination = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
    };
    
    const result = await objectsService.getObjects(filters, pagination);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/objects/statistics
 * Get object statistics
 */
router.get('/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await objectsService.getStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/objects/classifications
 * Get all classifications
 */
router.get('/classifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classifications = await objectsService.getClassifications();
    res.json(classifications);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/objects/departments
 * Get all departments
 */
router.get('/departments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await objectsService.getDepartments();
    res.json(departments);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/objects/:id
 * Get single object by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const object = await objectsService.getObjectById(id);
    
    if (!object) {
      throw new NotFoundError('Object');
    }
    
    res.json(object);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/objects/:id/details
 * Get object with images and constituents
 */
router.get('/:id/details', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const object = await objectsService.getObjectWithDetails(id);
    
    if (!object) {
      throw new NotFoundError('Object');
    }
    
    res.json(object);
  } catch (error) {
    next(error);
  }
});

export default router;
