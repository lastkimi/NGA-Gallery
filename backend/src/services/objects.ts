import { ObjectModel, IObject } from '../models/schemas';

export interface ObjectFilters {
  search?: string;
  classification?: string;
  department?: string;
  artist?: string;
  beginYear?: number;
  endYear?: number;
  medium?: string;
  hasImage?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ObjectListResponse {
  data: IObject[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ObjectsService {
  /**
   * Get objects with filters and pagination
   */
  async getObjects(filters: ObjectFilters, pagination: PaginationParams): Promise<ObjectListResponse> {
    const { page, limit, sortBy = 'object_id', sortOrder = 'asc' } = pagination;
    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    if (filters.search) {
      const searchTerms = filters.search.trim().split(/\s+/).filter(term => term.length > 0);
      if (searchTerms.length > 0) {
        // AND logic for search terms, OR logic for fields
        query.$and = searchTerms.map(term => {
          const regex = new RegExp(term, 'i');
          return {
            $or: [
              { title: regex },
              { attribution: regex },
              { medium: regex }
            ]
          };
        });
      }
    }
    
    if (filters.classification) {
      query.classification = filters.classification;
    }
    
    if (filters.department) {
      query.department = filters.department;
    }
    
    if (filters.artist) {
      // Escape special regex chars
      const safeArtist = filters.artist.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // Use word boundaries to avoid substring matches (e.g. "Dali" matching "Medalist")
      // We use a broader boundary check to handle cases where names might be at start/end or surrounded by punctuation
      query.attribution = new RegExp(`\\b${safeArtist}\\b`, 'i');
    }
    
    if (filters.beginYear) {
      query.begin_year = { $gte: filters.beginYear };
    }
    
    if (filters.endYear) {
      // Ensure we merge with existing query if beginYear is set
      query.end_year = { $lte: filters.endYear };
    }
    
    if (filters.medium) {
      query.medium = new RegExp(filters.medium, 'i');
    }

    // Default to only showing objects with images unless explicitly requested otherwise
    if (filters.hasImage !== false) {
      query['images.0'] = { $exists: true };
    }
    
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const [total, data] = await Promise.all([
      ObjectModel.countDocuments(query),
      ObjectModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get single object by ID
   */
  async getObjectById(objectId: string): Promise<IObject | null> {
    return ObjectModel.findOne({ object_id: objectId });
  }
  
  /**
   * Get object with images and constituents
   * In MongoDB, images are embedded. Constituents logic was flaky in SQL version,
   * here we can query ConstituentModel if we have a way to link them.
   * For now, just return object as images are already embedded.
   */
  async getObjectWithDetails(objectId: string) {
    const object = await ObjectModel.findOne({ object_id: objectId });
    if (!object) return null;
    
    // If we had constituent links, we would query them here.
    // Assuming for now the constituent data in Object (attribution) is sufficient 
    // or we don't have the link data imported.
    const constituents: any[] = []; 
    
    return {
      ...object.toObject(),
      constituents,
    };
  }
  
  /**
   * Get statistics
   */
  async getStatistics() {
    const [total, withImages] = await Promise.all([
      ObjectModel.countDocuments(),
      ObjectModel.countDocuments({ 'images.0': { $exists: true } }),
    ]);
    
    return {
      totalObjects: total,
      totalImages: withImages,
      totalArtists: 0, // Need count from ConstituentModel if imported
    };
  }
  
  /**
   * Get all classifications
   */
  async getClassifications(): Promise<string[]> {
    return ObjectModel.distinct('classification', { classification: { $ne: null } });
  }
  
  /**
   * Get all departments
   */
  async getDepartments(): Promise<string[]> {
    return ObjectModel.distinct('department', { department: { $ne: null } });
  }
}

export const objectsService = new ObjectsService();
