"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../models/database");
const router = (0, express_1.Router)();
/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
    });
});
/**
 * GET /health/ready
 * Readiness check (includes database)
 */
router.get('/ready', async (req, res, next) => {
    try {
        // Check database connection
        await (0, database_1.query)('SELECT 1');
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'connected',
            },
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'disconnected',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map