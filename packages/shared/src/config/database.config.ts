/**
 * Database Configuration
 * Centralized database settings
 */

import { DatabaseConfig } from './types';

// Database connection limits
export const DB_LIMITS = {
  MAX_CONNECTIONS: 10,
  MIN_CONNECTIONS: 2,
  CONNECTION_TIMEOUT: 20000, // 20 seconds
  IDLE_TIMEOUT: 10000, // 10 seconds
  ACQUIRE_TIMEOUT: 30000, // 30 seconds
} as const;

// Database query limits
export const DB_QUERY_LIMITS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  DEFAULT_OFFSET: 0,
} as const;

// Database retry configuration
export const DB_RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 5000,
  BACKOFF_MULTIPLIER: 1.5,
} as const;

// Database table names (for reference)
export const DB_TABLES = {
  USERS: 'User',
  ARTIST_PROFILES: 'ArtistProfile',
  OPPORTUNITIES: 'Opportunity',
  SESSIONS: 'Session',
  NOTIFICATIONS: 'Notification',
  AUDIT_LOGS: 'AuditLog',
} as const;

// Database indexes (for optimization reference)
export const DB_INDEXES = {
  USER_EMAIL: 'user_email_idx',
  OPPORTUNITY_RELEVANCE: 'opportunity_relevance_idx',
  OPPORTUNITY_DEADLINE: 'opportunity_deadline_idx',
  PROFILE_USER: 'profile_user_idx',
  SESSION_TOKEN: 'session_token_idx',
} as const;

// Database configuration factory
export function createDatabaseConfig(env: string = process.env.NODE_ENV || 'development'): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl && env !== 'test') {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    url: databaseUrl || 'postgresql://test@localhost:5432/test_db',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || String(DB_LIMITS.MAX_CONNECTIONS)),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(DB_LIMITS.CONNECTION_TIMEOUT)),
    ssl: env === 'production' ? true : false,
  };
}

// Prisma client options
export const PRISMA_OPTIONS = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
} as const;

// Export default configuration
export const databaseConfig = createDatabaseConfig();