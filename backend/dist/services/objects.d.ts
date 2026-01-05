import { Object } from '../models/types';
export interface ObjectFilters {
    search?: string;
    classification?: string;
    department?: string;
    artist?: string;
    beginYear?: number;
    endYear?: number;
    medium?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface ObjectListResponse {
    data: Object[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare class ObjectsService {
    /**
     * Get objects with filters and pagination
     */
    getObjects(filters: ObjectFilters, pagination: PaginationParams): Promise<ObjectListResponse>;
    /**
     * Get single object by ID
     */
    getObjectById(objectId: string): Promise<Object | null>;
    /**
     * Get object with images and constituents
     */
    getObjectWithDetails(objectId: string): Promise<any>;
    /**
     * Get all classifications
     */
    getClassifications(): Promise<string[]>;
    /**
     * Get all departments
     */
    getDepartments(): Promise<string[]>;
    /**
     * Get statistics
     */
    getStatistics(): Promise<{
        totalObjects: number;
        totalImages: number;
        totalArtists: number;
    }>;
}
export declare const objectsService: ObjectsService;
//# sourceMappingURL=objects.d.ts.map