"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectsService = exports.ObjectsService = void 0;
const database_1 = require("../models/database");
class ObjectsService {
    /**
     * Get objects with filters and pagination
     */
    async getObjects(filters, pagination) {
        const { page, limit, sortBy = 'id', sortOrder = 'asc' } = pagination;
        const offset = (page - 1) * limit;
        // Build dynamic query
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters.search) {
            whereClause += ` AND (
        o.title ILIKE $${paramIndex} OR 
        o.attribution ILIKE $${paramIndex} OR
        o.medium ILIKE $${paramIndex}
      )`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        if (filters.classification) {
            whereClause += ` AND o.classification = $${paramIndex}`;
            params.push(filters.classification);
            paramIndex++;
        }
        if (filters.department) {
            whereClause += ` AND o.department = $${paramIndex}`;
            params.push(filters.department);
            paramIndex++;
        }
        if (filters.artist) {
            whereClause += ` AND o.attribution ILIKE $${paramIndex}`;
            params.push(`%${filters.artist}%`);
            paramIndex++;
        }
        if (filters.beginYear) {
            whereClause += ` AND o.begin_year >= $${paramIndex}`;
            params.push(filters.beginYear);
            paramIndex++;
        }
        if (filters.endYear) {
            whereClause += ` AND o.end_year <= $${paramIndex}`;
            params.push(filters.endYear);
            paramIndex++;
        }
        if (filters.medium) {
            whereClause += ` AND o.medium ILIKE $${paramIndex}`;
            params.push(`%${filters.medium}%`);
            paramIndex++;
        }
        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM objects o ${whereClause}`;
        const countResult = await (0, database_1.query)(countQuery, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Get paginated results
        const dataQuery = `
      SELECT * FROM objects o
      ${whereClause}
      ORDER BY o.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const result = await (0, database_1.query)(dataQuery, params);
        const data = result.rows;
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
    async getObjectById(objectId) {
        const result = await (0, database_1.query)('SELECT * FROM objects WHERE object_id = $1', [objectId]);
        return result.rows[0] || null;
    }
    /**
     * Get object with images and constituents
     */
    async getObjectWithDetails(objectId) {
        const objectResult = await (0, database_1.query)(`SELECT * FROM objects WHERE object_id = $1`, [objectId]);
        if (!objectResult.rows[0]) {
            return null;
        }
        const object = objectResult.rows[0];
        // Get images
        const imagesResult = await (0, database_1.query)(`SELECT * FROM images WHERE object_id = $1 ORDER BY sequence`, [object.id]);
        // Get constituents
        const constituentsResult = await (0, database_1.query)(`SELECT c.* FROM constituents c
       JOIN objects_constituents oc ON c.constituent_id = oc.constituent_id
       WHERE oc.object_id = $1`, [object.id]);
        return {
            ...object,
            images: imagesResult.rows,
            constituents: constituentsResult.rows,
        };
    }
    /**
     * Get all classifications
     */
    async getClassifications() {
        const result = await (0, database_1.query)('SELECT DISTINCT classification FROM objects WHERE classification IS NOT NULL ORDER BY classification');
        return result.rows.map(row => row.classification);
    }
    /**
     * Get all departments
     */
    async getDepartments() {
        const result = await (0, database_1.query)('SELECT DISTINCT department FROM objects WHERE department IS NOT NULL ORDER BY department');
        return result.rows.map(row => row.department);
    }
    /**
     * Get statistics
     */
    async getStatistics() {
        const [totalObjects, totalImages, totalArtists] = await Promise.all([
            (0, database_1.query)('SELECT COUNT(*) as count FROM objects'),
            (0, database_1.query)('SELECT COUNT(*) as count FROM images'),
            (0, database_1.query)('SELECT COUNT(DISTINCT constituent_id) as count FROM objects_constituents'),
        ]);
        return {
            totalObjects: parseInt(totalObjects.rows[0].count, 10),
            totalImages: parseInt(totalImages.rows[0].count, 10),
            totalArtists: parseInt(totalArtists.rows[0].count, 10),
        };
    }
}
exports.ObjectsService = ObjectsService;
exports.objectsService = new ObjectsService();
//# sourceMappingURL=objects.js.map