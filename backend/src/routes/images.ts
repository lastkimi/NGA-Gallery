import { Router, Request, Response, NextFunction } from 'express';
import { imagesService } from '../services/images';
import { NotFoundError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';

const router = Router();

/**
 * GET /api/images
 * Get featured images
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const images = await imagesService.getFeaturedImages(limit);
    res.json(images);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/statistics
 * Get image statistics
 */
router.get('/statistics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await imagesService.getImageStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid
 * Get image by UUID
 */
router.get('/:uuid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image) {
      throw new NotFoundError('Image');
    }
    
    res.json(image);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid/thumbnail
 * Get image thumbnail
 */
router.get('/:uuid/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.thumb_path) {
      throw new NotFoundError('Thumbnail');
    }
    
    if (fs.existsSync(image.thumb_path)) {
      res.sendFile(image.thumb_path);
    } else {
      // Fallback to IIIF thumbnail URL
      if (image.iiif_thumb_url) {
        res.redirect(image.iiif_thumb_url);
      } else {
        throw new NotFoundError('Thumbnail');
      }
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid/preview
 * Get image preview
 */
router.get('/:uuid/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.preview_path) {
      throw new NotFoundError('Preview');
    }
    
    if (fs.existsSync(image.preview_path)) {
      res.sendFile(image.preview_path);
    } else {
      throw new NotFoundError('Preview');
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid/full
 * Get full resolution image
 */
router.get('/:uuid/full', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.full_path) {
      throw new NotFoundError('Full image');
    }
    
    if (fs.existsSync(image.full_path)) {
      res.sendFile(image.full_path);
    } else {
      // Fallback to IIIF URL
      if (image.iiif_url) {
        res.redirect(image.iiif_url);
      } else {
        throw new NotFoundError('Full image');
      }
    }
  } catch (error) {
    next(error);
  }
});

export default router;
