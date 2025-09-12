import { PrismaClient } from '@prisma/client';
import { createSentinelService } from '../../../packages/services/sentinel/factory';

/**
 * Integration example for the Sentinel Discovery Engine
 */
export class SentinelIntegration {
  private prisma: PrismaClient;
  private sentinelService: any;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  
  async initialize() {
    try {
      console.log('Initializing Sentinel Discovery Engine...');
      this.sentinelService = await createSentinelService(this.prisma);
      console.log('Sentinel Discovery Engine initialized successfully!');
      
      // Check health of all discoverers
      const health = await this.sentinelService.checkHealth();
      console.log('Discoverer health status:', health);
      
      // Get available sources
      const discoverers = this.sentinelService.getDiscoverers();
      console.log(`Available discoverers: ${discoverers.map((d: any) => d.name).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Sentinel:', error);
      return false;
    }
  }
  
  async runTestDiscovery() {
    if (!this.sentinelService) {
      throw new Error('Sentinel service not initialized');
    }
    
    try {
      console.log('Running test discovery...');
      
      const result = await this.sentinelService.runDiscovery({
        searchTerms: ['artist grants', 'art residencies'],
        maxResults: 10,
        location: 'United States'
      });
      
      console.log(`Discovery completed: ${result.newOpportunities} new opportunities found`);
      console.log(`Total processing time: ${result.processingTimeMs}ms`);
      
      if (result.errors.length > 0) {
        console.warn('Discovery errors:', result.errors);
      }
      
      return result;
    } catch (error) {
      console.error('Test discovery failed:', error);
      throw error;
    }
  }
  
  async getStats() {
    if (!this.sentinelService) {
      throw new Error('Sentinel service not initialized');
    }
    
    const stats = this.sentinelService.getPluginStats();
    console.log('Sentinel plugin statistics:', stats);
    return stats;
  }
  
  async shutdown() {
    if (this.sentinelService) {
      await this.sentinelService.shutdown();
      console.log('Sentinel service shut down');
    }
  }
}

// Example usage in your main application
export async function initializeSentinel(prisma: PrismaClient) {
  const integration = new SentinelIntegration(prisma);
  const success = await integration.initialize();
  
  if (success) {
    console.log('✅ Sentinel Discovery Engine is ready!');
    
    // Uncomment to run a test discovery
    // try {
    //   await integration.runTestDiscovery();
    // } catch (error) {
    //   console.error('Test discovery failed:', error);
    // }
  } else {
    console.error('❌ Failed to initialize Sentinel Discovery Engine');
  }
  
  return integration;
}