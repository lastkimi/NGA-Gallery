"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const objects_1 = __importDefault(require("./routes/objects"));
const images_1 = __importDefault(require("./routes/images"));
const search_1 = __importDefault(require("./routes/search"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const health_1 = __importDefault(require("./routes/health"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Body parsing and compression
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, compression_1.default)());
// Logging
app.use((0, morgan_1.default)('combined'));
app.use(requestLogger_1.requestLogger);
// Health check endpoint
app.use('/health', health_1.default);
// API routes
app.use('/api/objects', objects_1.default);
app.use('/api/images', images_1.default);
app.use('/api/search', search_1.default);
app.use('/api/analysis', analysis_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NGA Online Museum API',
        version: '1.0.0',
        description: 'API for accessing National Gallery of Art collection data',
        endpoints: {
            objects: '/api/objects',
            images: '/api/images',
            search: '/api/search',
            analysis: '/api/analysis',
        },
    });
});
// Error handling
app.use(errorHandler_1.errorHandler);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API documentation: http://localhost:${PORT}/`);
});
exports.default = app;
//# sourceMappingURL=index.js.map