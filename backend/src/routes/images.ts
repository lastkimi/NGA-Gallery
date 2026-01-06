import { Router, Request, Response, NextFunction } from 'express';
import { imagesService } from '../services/images';
import { NotFoundError } from '../middleware/errorHandler';

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
 * Get image thumbnail (Redirect to IIIF)
 */
router.get('/:uuid/thumbnail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.iiif_thumb_url) {
      throw new NotFoundError('Thumbnail');
    }
    
    res.redirect(image.iiif_thumb_url);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid/preview
 * Get image preview (Redirect to IIIF)
 */
router.get('/:uuid/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.iiif_url) {
      throw new NotFoundError('Preview');
    }
    
    // IIIF URL for preview size (e.g. 1200px width)
    const previewUrl = `${image.iiif_url}/full/1200,/0/default.jpg`;
    res.redirect(previewUrl);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/images/:uuid/full
 * Get full resolution image (Redirect to IIIF)
 */
router.get('/:uuid/full', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uuid } = req.params;
    const image = await imagesService.getImageByUuid(uuid);
    
    if (!image || !image.iiif_url) {
      throw new NotFoundError('Full image');
    }
    
    // IIIF URL for full size
    const fullUrl = `${image.iiif_url}/full/full/0/default.jpg`;
    res.redirect(fullUrl);
  } catch (error) {
    next(error);
  }
});

export default router;
