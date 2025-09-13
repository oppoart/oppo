import { z } from 'zod';
import dotenv from 'dotenv';
import { 
  getConfig, 
  validateEnvironment as validateSharedEnv,
  API_TIMEOUTS,
  AUTH_RATE_LIMITS,
  RATE_LIMIT_WINDOWS,
  HTTP_STATUS,
  API_MESSAGES
} from '../../../../packages/shared/src';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),

  // Authentication & Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  SESSION_TIMEOUT_HOURS: z.string().transform(Number).default('24'),

  // AI Configuration (required for Sprint 1)
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL_PRIMARY: z.string().default('gpt-4'),
  AI_MODEL_FALLBACK: z.string().default('gpt-3.5-turbo'),
  AI_MAX_TOKENS: z.string().transform(Number).default('2000'),
  AI_RATE_LIMIT: z.string().transform(Number).default('100'),
  
  // External APIs 
  FIRECRAWL_API_KEY: z.string().optional(),
  
  // Google Search API Configuration (standardized names)
  GOOGLE_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),
  
  // Legacy support (will be deprecated)
  GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),

  // Email Services (for password reset emails)
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // SMTP Configuration (fallback email service)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('5'), // Auth endpoints

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Admin Configuration
  ADMIN_EMAIL: z.string().email().optional(),
  
  // Health Check Configuration
  HEALTH_CHECK_ENABLED: z.string().transform(val => val === 'true').default('true'),
});

// Validate and parse environment variables
export const env = envSchema.parse(process.env);

// Environment-specific configurations
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Database configuration
export const dbConfig = {
  url: env.DATABASE_URL,
  // Add SSL for production
  ssl: isProduction,
};

// CORS configuration
export const corsConfig = {
  origin: env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// Auth rate limiting configuration (more restrictive)
export const authRateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
};

// Security configuration
export const securityConfig = {
  bcryptRounds: env.BCRYPT_ROUNDS,
  jwtSecret: env.JWT_SECRET,
  sessionTimeoutHours: env.SESSION_TIMEOUT_HOURS,
  // Add more security settings for production
  helmet: {
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: isProduction,
  },
};

// Logging configuration
export const logConfig = {
  level: env.LOG_LEVEL,
  format: isDevelopment ? 'dev' : 'combined',
  // In production, we might want to log to files or external service
  file: isProduction ? '/var/log/oppo/app.log' : null,
};

// AI configuration
export const aiConfig = {
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  modelPrimary: env.AI_MODEL_PRIMARY,
  modelFallback: env.AI_MODEL_FALLBACK,
  maxTokens: env.AI_MAX_TOKENS,
  rateLimit: env.AI_RATE_LIMIT,
};

// Validation helper
export function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  // First validate using shared configuration validator
  try {
    validateSharedEnv();
  } catch (error) {
    console.error('Shared configuration validation failed:', error);
    throw error;
  }
  
  // Check required environment variables
  const requiredForProduction = ['JWT_SECRET', 'DATABASE_URL'];
  
  if (isProduction) {
    for (const key of requiredForProduction) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
    
    // Additional production checks
    if (env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    
    if (env.DATABASE_URL.includes('localhost')) {
      console.warn('⚠️  Warning: Using localhost database in production environment');
    }
  }
  
  console.log(`✅ Environment validated for ${env.NODE_ENV} mode`);
  console.log(`📊 Database: ${env.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
  console.log(`📝 Log Level: ${env.LOG_LEVEL}`);
  
  return env;
}

// Export shared configuration for use in the application
export const sharedConfig = getConfig();