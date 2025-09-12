// Core interfaces and types
export * from './core/interfaces';
export * from './core/BaseDiscoverer';
export * from './core/SentinelService';

// Configuration management
export * from './config/SourceConfigManager';

// Managers
export * from './managers/RateLimiter';
export * from './managers/JobScheduler';
export * from './managers/DiscoveryJobManager';

// Scrapers
export * from './scrapers/firecrawl/firecrawl';
export * from './scrapers/llm-search/perplexity';

// API
export * from './api/sentinel';

// Main service factory function
export { createSentinelService } from './factory';

// Version info
export const SENTINEL_VERSION = '1.0.0';