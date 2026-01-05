import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import objectRoutes from './routes/objects';
import imageRoutes from './routes/images';
import searchRoutes from './routes/search';
import analysisRoutes from './routes/analysis';
import healthRoutes from './routes/health';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing and compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Health check endpoint
app.use('/health', healthRoutes);

// API routes
app.use('/api/objects', objectRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analysis', analysisRoutes);

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
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation: http://localhost:${PORT}/`);
});

export default app;
