import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import profilesRoutes from './routes/profiles';
import usersRoutes from './routes/users';
import archivistRoutes from './routes/archivist';
import analystRoutes from './routes/analyst';
import researchRoutes from './routes/research';
import searchRoutes from './routes/search';
import queryBucketRoutes from './routes/query-bucket';
import { 
  validateEnvironment, 
  env, 
  corsConfig, 
  rateLimitConfig, 
  securityConfig,
  isProduction 
} from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestLogger, errorLogger, performanceMonitor } from './middleware/logger';
import { sanitizeMiddleware } from './middleware/validation';

// Validate environment before starting server
validateEnvironment();

const app: Application = express();

// Security middleware with environment-based configuration
app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: isProduction,
}));

// CORS with environment-based configuration
app.use(cors(corsConfig));

// Rate limiting with environment-based configuration
const limiter = rateLimit(rateLimitConfig);
app.use('/api', limiter);

// betterAuth handles sessions internally, no need for express-session

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add performance monitoring
app.use(performanceMonitor);

// Add request logging
app.use(requestLogger);

// Sanitize all input data
app.use(sanitizeMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error : 'Database connection failed'
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Artist profiles routes
app.use('/api/profiles', profilesRoutes);

// User settings and preferences routes
app.use('/api/users', usersRoutes);

// Archivist data management routes
app.use('/api/archivist', archivistRoutes);

// Analyst AI-powered analysis routes
app.use('/api/analyst', analystRoutes);

// Research dashboard routes
app.use('/api/research', researchRoutes);

// Search routes (Google Search API)
app.use('/api/search', searchRoutes);

// Query Bucket routes (save search queries)
app.use('/api/query-bucket', queryBucketRoutes);

// Basic API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'OPPO Backend API is running!' });
});

// 404 handler - must be before error handler
app.use('*', notFoundHandler);

// Error logging middleware
app.use(errorLogger);

// Global error handler - must be last
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 OPPO Backend server running on port ${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/health`);
  console.log(`🔧 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`📝 Log Level: ${env.LOG_LEVEL}`);
  
  if (env.NODE_ENV === 'development') {
    console.log(`🔨 Development mode: Hot reload enabled`);
  }
  
  if (env.NODE_ENV === 'production') {
    console.log(`🔒 Production mode: Enhanced security enabled`);
  }
});

export default app;