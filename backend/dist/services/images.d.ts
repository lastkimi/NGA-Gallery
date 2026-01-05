import { Image } from '../models/types';
export declare class ImagesService {
    /**
     * Get images by object ID
     */
    getImagesByObjectId(objectId: number): Promise<Image[]>;
    /**
     * Get image by UUID
     */
    getImageByUuid(uuid: string): Promise<Image | null>;
    /**
     * Get random featured images
     */
    getFeaturedImages(limit?: number): Promise<Image[]>;
    /**
     * Get image statistics
     */
    getImageStatistics(): Promise<{
        total: number;
        byViewType: any[];
        averageWidth: number;
        averageHeight: number;
    }>;
}
export declare const imagesService: ImagesService;
//# sourceMappingURL=images.d.ts.map