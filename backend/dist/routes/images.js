"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const images_1 = require("../services/images");
const errorHandler_1 = require("../middleware/errorHandler");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
/**
 * GET /api/images
 * Get featured images
 */
router.get('/', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const images = await images_1.imagesService.getFeaturedImages(limit);
        res.json(images);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/images/statistics
 * Get image statistics
 */
router.get('/statistics', async (req, res, next) => {
    try {
        const stats = await images_1.imagesService.getImageStatistics();
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/images/:uuid
 * Get image by UUID
 */
router.get('/:uuid', async (req, res, next) => {
    try {
        const { uuid } = req.params;
        const image = await images_1.imagesService.getImageByUuid(uuid);
        if (!image) {
            throw new errorHandler_1.NotFoundError('Image');
        }
        res.json(image);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/images/:uuid/thumbnail
 * Get image thumbnail
 */
router.get('/:uuid/thumbnail', async (req, res, next) => {
    try {
        const { uuid } = req.params;
        const image = await images_1.imagesService.getImageByUuid(uuid);
        if (!image || !image.thumb_path) {
            throw new errorHandler_1.NotFoundError('Thumbnail');
        }
        if (fs_1.default.existsSync(image.thumb_path)) {
            res.sendFile(image.thumb_path);
        }
        else {
            // Fallback to IIIF thumbnail URL
            if (image.iiif_thumb_url) {
                res.redirect(image.iiif_thumb_url);
            }
            else {
                throw new errorHandler_1.NotFoundError('Thumbnail');
            }
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/images/:uuid/preview
 * Get image preview
 */
router.get('/:uuid/preview', async (req, res, next) => {
    try {
        const { uuid } = req.params;
        const image = await images_1.imagesService.getImageByUuid(uuid);
        if (!image || !image.preview_path) {
            throw new errorHandler_1.NotFoundError('Preview');
        }
        if (fs_1.default.existsSync(image.preview_path)) {
            res.sendFile(image.preview_path);
        }
        else {
            throw new errorHandler_1.NotFoundError('Preview');
        }
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/images/:uuid/full
 * Get full resolution image
 */
router.get('/:uuid/full', async (req, res, next) => {
    try {
        const { uuid } = req.params;
        const image = await images_1.imagesService.getImageByUuid(uuid);
        if (!image || !image.full_path) {
            throw new errorHandler_1.NotFoundError('Full image');
        }
        if (fs_1.default.existsSync(image.full_path)) {
            res.sendFile(image.full_path);
        }
        else {
            // Fallback to IIIF URL
            if (image.iiif_url) {
                res.redirect(image.iiif_url);
            }
            else {
                throw new errorHandler_1.NotFoundError('Full image');
            }
        }
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=images.js.map