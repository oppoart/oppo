/**
 * Central Configuration Management System
 * This module exports all configuration for the OPPO application
 */

export * from './api.config';
export * from './database.config';
export * from './scraper.config';
export * from './validation.config';
export * from './ui.config';
export * from './auth.config';
export * from './rate-limit.config';
export * from './ai.config';

// Re-export configuration types
export * from './types';

// Configuration validator
export { validateConfig } from './validator';