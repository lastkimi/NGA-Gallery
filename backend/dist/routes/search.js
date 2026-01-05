"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../models/database");
const router = (0, express_1.Router)();
/**
 * GET /api/search
 * Full-text search across objects
 */
router.get('/', async (req, res, next) => {
    try {
        const { q, page = '1', limit = '20' } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }
        const searchTerm = `%${q}%`;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        // Search query
        const result = await (0, database_1.query)(`SELECT * FROM objects 
       WHERE 
         title ILIKE $1 OR 
         attribution ILIKE $1 OR 
         medium ILIKE $1 OR
         display_date ILIKE $1
       ORDER BY id
       LIMIT $2 OFFSET $3`, [searchTerm, parseInt(limit, 10), offset]);
        // Get total count
        const countResult = await (0, database_1.query)(`SELECT COUNT(*) as total FROM objects 
       WHERE 
         title ILIKE $1 OR 
         attribution ILIKE $1 OR 
         medium ILIKE $1 OR
         display_date ILIKE $1`, [searchTerm]);
        const total = parseInt(countResult.rows[0].total, 10);
        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / parseInt(limit, 10)),
            },
            query: q,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/search/suggestions
 * Get search suggestions (autocomplete)
 */
router.get('/suggestions', async (req, res, next) => {
    try {
        const { q, limit = '10' } = req.query;
        if (!q) {
            return res.json([]);
        }
        const searchTerm = `${q}%`;
        const result = await (0, database_1.query)(`SELECT DISTINCT title, attribution FROM objects 
       WHERE title ILIKE $1 OR attribution ILIKE $1
       ORDER BY title
       LIMIT $2`, [searchTerm, parseInt(limit, 10)]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map