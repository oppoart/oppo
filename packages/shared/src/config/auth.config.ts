/**
 * Authentication Configuration
 * Centralized authentication and security settings
 */

import { AuthConfig } from './types';

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

// JWT token settings
export const JWT_SETTINGS = {
  ACCESS_TOKEN_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  RESET_TOKEN_EXPIRES_IN: '1h',
  VERIFICATION_TOKEN_EXPIRES_IN: '24h',
  ALGORITHM: 'HS256',
} as const;

// Session settings
export const SESSION_SETTINGS = {
  DEFAULT_TIMEOUT_HOURS: 24,
  MAX_TIMEOUT_HOURS: 168, // 7 days
  SLIDING_WINDOW: true,
  COOKIE_NAME: 'oppo_session',
  COOKIE_SECURE: process.env.NODE_ENV === 'production',
  COOKIE_HTTP_ONLY: true,
  COOKIE_SAME_SITE: 'lax' as const,
} as const;

// Bcrypt settings
export const BCRYPT_SETTINGS = {
  DEFAULT_ROUNDS: 12,
  MIN_ROUNDS: 10,
  MAX_ROUNDS: 15,
} as const;

// Auth rate limiting
export const AUTH_RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5,
    BLOCK_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  },
  REGISTER: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_ATTEMPTS: 3,
    BLOCK_DURATION_MS: 60 * 60 * 1000, // 1 hour
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_ATTEMPTS: 3,
    BLOCK_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

// OAuth providers configuration
export const OAUTH_PROVIDERS = {
  GOOGLE: {
    ENABLED: !!process.env.GOOGLE_CLIENT_ID,
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: '/api/auth/google/callback',
  },
  GITHUB: {
    ENABLED: !!process.env.GITHUB_CLIENT_ID,
    CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    CALLBACK_URL: '/api/auth/github/callback',
  },
} as const;

// Auth error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_NOT_FOUND: 'Account not found',
  ACCOUNT_DISABLED: 'Account has been disabled',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  SESSION_EXPIRED: 'Session has expired',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  PASSWORD_TOO_WEAK: 'Password does not meet requirements',
  EMAIL_ALREADY_EXISTS: 'Email address already registered',
  RATE_LIMITED: 'Too many attempts. Please try again later',
} as const;

// Authentication configuration factory
export function createAuthConfig(env: string = process.env.NODE_ENV || 'development'): AuthConfig {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret && env !== 'test') {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    jwtSecret: jwtSecret || 'test_jwt_secret_for_testing_only',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || String(BCRYPT_SETTINGS.DEFAULT_ROUNDS)),
    sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || String(SESSION_SETTINGS.DEFAULT_TIMEOUT_HOURS)),
    tokenExpiresIn: JWT_SETTINGS.ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: JWT_SETTINGS.REFRESH_TOKEN_EXPIRES_IN,
  };
}

// Export default configuration
export const authConfig = createAuthConfig();