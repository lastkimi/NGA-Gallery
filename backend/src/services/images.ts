import { query } from '../models/database';
import { Image } from '../models/types';

export class ImagesService {
  /**
   * Get images by object ID
   */
  async getImagesByObjectId(objectId: number): Promise<Image[]> {
    const result = await query(
      `SELECT * FROM images WHERE object_id = $1 ORDER BY sequence`,
      [objectId]
    );
    return result.rows;
  }
  
  /**
   * Get image by UUID
   */
  async getImageByUuid(uuid: string): Promise<Image | null> {
    const result = await query(
      'SELECT * FROM images WHERE uuid = $1',
      [uuid]
    );
    return result.rows[0] || null;
  }
  
  /**
   * Get random featured images
   */
  async getFeaturedImages(limit: number = 10): Promise<Image[]> {
    const result = await query(
      `SELECT * FROM images 
       WHERE view_type = 'primary' 
       ORDER BY RANDOM() 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
  
  /**
   * Get image statistics
   */
  async getImageStatistics() {
    const [total, byViewType, avgDimensions] = await Promise.all([
      query('SELECT COUNT(*) as count FROM images'),
      query(`SELECT view_type, COUNT(*) as count FROM images GROUP BY view_type`),
      query(`SELECT AVG(width) as avg_width, AVG(height) as avg_height FROM images WHERE width IS NOT NULL`),
    ]);
    
    return {
      total: parseInt(total.rows[0].count, 10),
      byViewType: byViewType.rows,
      averageWidth: parseFloat(avgDimensions.rows[0].avg_width),
      averageHeight: parseFloat(avgDimensions.rows[0].avg_height),
    };
  }
}

export const imagesService = new ImagesService();
