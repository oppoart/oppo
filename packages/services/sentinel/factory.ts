import { PrismaClient } from '@prisma/client';
import { SentinelService } from './core/SentinelService';
import { SourceConfigManager } from './config/SourceConfigManager';
import { RateLimiter } from './managers/RateLimiter';
import { JobScheduler } from './managers/JobScheduler';
import { DiscoveryJobManager } from './managers/DiscoveryJobManager';
import { OpportunityRepository } from '../archivist/repositories/OpportunityRepository';
import { DeduplicationService } from '../archivist/deduplication/DeduplicationService';
import { FirecrawlDiscoverer } from './scrapers/firecrawl/firecrawl';
import { PerplexityDiscoverer } from './scrapers/llm-search/perplexity';
import { SentinelConfig } from './core/interfaces';

/**
 * Factory function to create and configure the Sentinel service
 */
export async function createSentinelService(
  prisma: PrismaClient,
  config?: Partial<SentinelConfig>
): Promise<SentinelService> {
  // Default configuration
  const defaultConfig: SentinelConfig = {
    maxConcurrentJobs: parseInt(process.env.DISCOVERY_MAX_CONCURRENT || '5', 10),
    defaultTimeout: 120000, // 2 minutes
    retryAttempts: 3,
    rateLimitEnabled: true,
    schedulingEnabled: true,
    sources: {}
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Create core services
  const configManager = new SourceConfigManager();
  const rateLimiter = new RateLimiter();
  const jobScheduler = new JobScheduler();
  const jobManager = new DiscoveryJobManager();
  
  // Create repository services
  const opportunityRepository = new OpportunityRepository(prisma);
  const deduplicationService = new DeduplicationService(prisma);
  
  // Create main Sentinel service
  const sentinelService = new SentinelService(
    configManager,
    rateLimiter,
    jobScheduler,
    jobManager,
    opportunityRepository,
    deduplicationService,
    finalConfig
  );
  
  // Initialize the service
  await sentinelService.initialize();
  
  // Register available discoverers
  await registerDiscoverers(sentinelService);
  
  // Set up job execution callback
  jobScheduler.setJobExecuteCallback(async (discovererName, context) => {
    try {
      await sentinelService.runSpecificDiscovery([discovererName], context);
    } catch (error) {
      console.error(`Scheduled discovery failed for ${discovererName}:`, error);
    }
  });
  
  // Add default schedules if enabled
  if (finalConfig.schedulingEnabled) {
    jobScheduler.addDefaultSchedules();
  }
  
  console.log('Sentinel Discovery Engine initialized successfully');
  
  return sentinelService;
}

/**
 * Register all available discoverers
 */
async function registerDiscoverers(sentinelService: SentinelService): Promise<void> {
  const discoverers = [
    new FirecrawlDiscoverer(),
    new PerplexityDiscoverer()
  ];
  
  for (const discoverer of discoverers) {
    try {
      await sentinelService.registerDiscoverer(discoverer);
    } catch (error) {
      console.warn(`Failed to register discoverer ${discoverer.name}:`, error);
    }
  }
}

/**
 * Create a minimal Sentinel service for testing
 */
export async function createTestSentinelService(prisma: PrismaClient): Promise<SentinelService> {
  return createSentinelService(prisma, {
    maxConcurrentJobs: 2,
    schedulingEnabled: false,
    rateLimitEnabled: false
  });
}