"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const objects_1 = require("../services/objects");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
/**
 * GET /api/objects
 * Get list of objects with filters and pagination
 */
router.get('/', async (req, res, next) => {
    try {
        const { search, classification, department, artist, beginYear, endYear, medium, page = '1', limit = '20', sortBy = 'id', sortOrder = 'asc', } = req.query;
        const filters = {
            search: search,
            classification: classification,
            department: department,
            artist: artist,
            beginYear: beginYear ? parseInt(beginYear, 10) : undefined,
            endYear: endYear ? parseInt(endYear, 10) : undefined,
            medium: medium,
        };
        const pagination = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sortBy: sortBy,
            sortOrder: sortOrder || 'asc',
        };
        const result = await objects_1.objectsService.getObjects(filters, pagination);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/objects/statistics
 * Get object statistics
 */
router.get('/statistics', async (req, res, next) => {
    try {
        const stats = await objects_1.objectsService.getStatistics();
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/objects/classifications
 * Get all classifications
 */
router.get('/classifications', async (req, res, next) => {
    try {
        const classifications = await objects_1.objectsService.getClassifications();
        res.json(classifications);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/objects/departments
 * Get all departments
 */
router.get('/departments', async (req, res, next) => {
    try {
        const departments = await objects_1.objectsService.getDepartments();
        res.json(departments);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/objects/:id
 * Get single object by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const object = await objects_1.objectsService.getObjectById(id);
        if (!object) {
            throw new errorHandler_1.NotFoundError('Object');
        }
        res.json(object);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/objects/:id/details
 * Get object with images and constituents
 */
router.get('/:id/details', async (req, res, next) => {
    try {
        const { id } = req.params;
        const object = await objects_1.objectsService.getObjectWithDetails(id);
        if (!object) {
            throw new errorHandler_1.NotFoundError('Object');
        }
        res.json(object);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=objects.js.map