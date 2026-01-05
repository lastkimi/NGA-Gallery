"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagesService = exports.ImagesService = void 0;
const database_1 = require("../models/database");
class ImagesService {
    /**
     * Get images by object ID
     */
    async getImagesByObjectId(objectId) {
        const result = await (0, database_1.query)(`SELECT * FROM images WHERE object_id = $1 ORDER BY sequence`, [objectId]);
        return result.rows;
    }
    /**
     * Get image by UUID
     */
    async getImageByUuid(uuid) {
        const result = await (0, database_1.query)('SELECT * FROM images WHERE uuid = $1', [uuid]);
        return result.rows[0] || null;
    }
    /**
     * Get random featured images
     */
    async getFeaturedImages(limit = 10) {
        const result = await (0, database_1.query)(`SELECT * FROM images 
       WHERE view_type = 'primary' 
       ORDER BY RANDOM() 
       LIMIT $1`, [limit]);
        return result.rows;
    }
    /**
     * Get image statistics
     */
    async getImageStatistics() {
        const [total, byViewType, avgDimensions] = await Promise.all([
            (0, database_1.query)('SELECT COUNT(*) as count FROM images'),
            (0, database_1.query)(`SELECT view_type, COUNT(*) as count FROM images GROUP BY view_type`),
            (0, database_1.query)(`SELECT AVG(width) as avg_width, AVG(height) as avg_height FROM images WHERE width IS NOT NULL`),
        ]);
        return {
            total: parseInt(total.rows[0].count, 10),
            byViewType: byViewType.rows,
            averageWidth: parseFloat(avgDimensions.rows[0].avg_width),
            averageHeight: parseFloat(avgDimensions.rows[0].avg_height),
        };
    }
}
exports.ImagesService = ImagesService;
exports.imagesService = new ImagesService();
//# sourceMappingURL=images.js.map