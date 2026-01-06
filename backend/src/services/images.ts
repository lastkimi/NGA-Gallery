import { ObjectModel, IImage } from '../models/schemas';

export class ImagesService {
  /**
   * Get images by object ID
   */
  async getImagesByObjectId(objectId: string): Promise<IImage[]> {
    const object = await ObjectModel.findOne({ object_id: objectId }, { images: 1 });
    return object?.images || [];
  }
  
  /**
   * Get image by UUID
   */
  async getImageByUuid(uuid: string): Promise<IImage | null> {
    const object = await ObjectModel.findOne({ 'images.uuid': uuid }, { 'images.$': 1 });
    if (!object || !object.images || object.images.length === 0) return null;
    return object.images[0];
  }
  
  /**
   * Get random featured images
   */
  async getFeaturedImages(limit: number = 10): Promise<IImage[]> {
    const result = await ObjectModel.aggregate([
      { $unwind: '$images' },
      { $match: { 'images.view_type': 'primary' } },
      { $sample: { size: limit } },
      { $replaceRoot: { newRoot: '$images' } }
    ]);
    return result;
  }
  
  /**
   * Get image statistics
   */
  async getImageStatistics() {
    const [totalStats, viewTypeStats, dimensionStats] = await Promise.all([
      // Total count
      ObjectModel.aggregate([
        { $unwind: '$images' },
        { $count: 'count' }
      ]),
      // By View Type
      ObjectModel.aggregate([
        { $unwind: '$images' },
        { $group: { _id: '$images.view_type', count: { $sum: 1 } } }
      ]),
      // Avg Dimensions
      ObjectModel.aggregate([
        { $unwind: '$images' },
        { $match: { 'images.width': { $ne: null } } },
        { $group: { _id: null, avg_width: { $avg: '$images.width' }, avg_height: { $avg: '$images.height' } } }
      ])
    ]);
    
    return {
      total: totalStats[0]?.count || 0,
      byViewType: viewTypeStats.map(stat => ({ view_type: stat._id, count: stat.count })),
      averageWidth: dimensionStats[0]?.avg_width || 0,
      averageHeight: dimensionStats[0]?.avg_height || 0,
    };
  }
}

export const imagesService = new ImagesService();
