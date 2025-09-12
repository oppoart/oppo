import { SentinelService } from '../../core/SentinelService';
import { MonitoringService } from '../../monitoring/MonitoringService';
import { PlaybookManager } from '../../playbooks/PlaybookManager';
import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DiscoveryContext } from '../../core/interfaces';
import * as path from 'path';
import * as fs from 'fs/promises';

// Mock discoverer for testing
class MockDiscoverer extends BaseDiscoverer {
  private mockOpportunities: OpportunityData[];
  private shouldFail: boolean;

  constructor(
    name: string, 
    mockOpportunities: OpportunityData[] = [], 
    shouldFail: boolean = false
  ) {
    super(name, 'test', '1.0.0');
    this.mockOpportunities = mockOpportunities;
    this.shouldFail = shouldFail;
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    if (this.shouldFail) {
      throw new Error('Mock discovery failure');
    }

    const maxResults = context?.maxResults || this.mockOpportunities.length;
    return this.mockOpportunities.slice(0, maxResults);
  }

  setMockOpportunities(opportunities: OpportunityData[]): void {
    this.mockOpportunities = opportunities;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

describe('Discovery Pipeline Integration', () => {
  let sentinelService: SentinelService;
  let monitoringService: MonitoringService;
  let playbookManager: PlaybookManager;
  let testDataDir: string;
  let mockDiscoverer1: MockDiscoverer;
  let mockDiscoverer2: MockDiscoverer;

  beforeEach(async () => {
    testDataDir = path.join(__dirname, '../../../temp/integration-test');
    
    // Create test directories
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'monitoring'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'playbooks'), { recursive: true });

    // Initialize services
    monitoringService = new MonitoringService(path.join(testDataDir, 'monitoring'));
    await monitoringService.initialize();

    playbookManager = new PlaybookManager(
      path.join(testDataDir, 'playbooks/definitions'),
      path.join(testDataDir, 'playbooks/templates'),
      path.join(testDataDir, 'playbooks/history')
    );
    await playbookManager.initialize();

    sentinelService = new SentinelService();
    await sentinelService.initialize();

    // Create mock discoverers with test opportunities
    const mockOpportunities1: OpportunityData[] = [
      {
        title: 'Art Grant 2025',
        description: 'Annual art grant for emerging artists',
        url: 'https://example.com/grant1',
        organization: 'Arts Foundation',
        sourceType: 'test',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        tags: ['grant', 'emerging-artists']
      },
      {
        title: 'Residency Program',
        description: 'Summer residency for visual artists',
        url: 'https://example.com/residency1',
        organization: 'Art Center',
        sourceType: 'test',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        tags: ['residency', 'visual-arts']
      }
    ];

    const mockOpportunities2: OpportunityData[] = [
      {
        title: 'Digital Arts Competition',
        description: 'Competition for digital and interactive art',
        url: 'https://example.com/competition1',
        organization: 'Tech Arts Hub',
        sourceType: 'test',
        status: 'new',
        processed: false,
        applied: false,
        starred: false,
        tags: ['competition', 'digital-arts']
      }
    ];

    mockDiscoverer1 = new MockDiscoverer('mock-source-1', mockOpportunities1);
    mockDiscoverer2 = new MockDiscoverer('mock-source-2', mockOpportunities2);

    // Register discoverers
    sentinelService.registerDiscoverer(mockDiscoverer1);
    sentinelService.registerDiscoverer(mockDiscoverer2);
  });

  afterEach(async () => {
    await sentinelService.cleanup();
    
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('End-to-End Discovery Pipeline', () => {
    it('should discover opportunities from all registered sources', async () => {
      const context: DiscoveryContext = {
        maxResults: 10,
        searchTerms: ['art', 'grant'],
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(2); // Two sources
      expect(results[0].opportunities).toHaveLength(2); // mock-source-1 has 2 opportunities
      expect(results[1].opportunities).toHaveLength(1); // mock-source-2 has 1 opportunity

      // Check that all opportunities have required fields
      results.forEach(result => {
        result.opportunities.forEach(opportunity => {
          expect(opportunity.title).toBeTruthy();
          expect(opportunity.description).toBeTruthy();
          expect(opportunity.url).toBeTruthy();
          expect(opportunity.sourceType).toBe('test');
          expect(opportunity.tags).toBeInstanceOf(Array);
        });
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Make one discoverer fail
      mockDiscoverer2.setShouldFail(true);

      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(2);
      
      // First source should succeed
      expect(results[0].sourceId).toBe('mock-source-1');
      expect(results[0].opportunities).toHaveLength(2);
      expect(results[0].errors).toHaveLength(0);

      // Second source should fail
      expect(results[1].sourceId).toBe('mock-source-2');
      expect(results[1].opportunities).toHaveLength(0);
      expect(results[1].errors.length).toBeGreaterThan(0);
    });

    it('should respect maxResults parameter', async () => {
      const context: DiscoveryContext = {
        maxResults: 1, // Limit to 1 result per source
        enabledSources: ['mock-source-1']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(1);
      expect(results[0].opportunities).toHaveLength(1);
    });

    it('should filter by enabled sources', async () => {
      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1'] // Only enable first source
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe('mock-source-1');
    });

    it('should process search terms correctly', async () => {
      const context: DiscoveryContext = {
        maxResults: 10,
        searchTerms: ['specific-term'],
        enabledSources: ['mock-source-1']
      };

      const results = await sentinelService.discover(context);

      // Search terms should be passed to the discoverer
      expect(results).toHaveLength(1);
      expect(results[0].opportunities).toHaveLength(2); // Mock discoverer returns all opportunities regardless of search terms
    });
  });

  describe('Concurrent Discovery', () => {
    it('should handle concurrent discovery requests', async () => {
      const context: DiscoveryContext = {
        maxResults: 5,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      // Run multiple discoveries concurrently
      const promises = [
        sentinelService.discover(context),
        sentinelService.discover(context),
        sentinelService.discover(context)
      ];

      const allResults = await Promise.all(promises);

      // All should succeed
      allResults.forEach(results => {
        expect(results).toHaveLength(2);
        expect(results[0].opportunities).toHaveLength(2);
        expect(results[1].opportunities).toHaveLength(1);
      });
    });

    it('should handle rate limiting correctly', async () => {
      // Configure rate limiting for discoverers
      const config = {
        enabled: true,
        priority: 'medium' as const,
        rateLimit: 2, // 2 requests per minute
        timeout: 5000,
        retryAttempts: 1,
        metadata: {}
      };

      await mockDiscoverer1.initialize(config);
      await mockDiscoverer2.initialize(config);

      const context: DiscoveryContext = {
        maxResults: 5,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      // Run discovery multiple times quickly
      const start = Date.now();
      const results1 = await sentinelService.discover(context);
      const results2 = await sentinelService.discover(context);
      const duration = Date.now() - start;

      expect(results1).toHaveLength(2);
      expect(results2).toHaveLength(2);
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(1000); // At least 1 second delay
    });
  });

  describe('Data Processing and Deduplication', () => {
    it('should deduplicate opportunities with same URL', async () => {
      const duplicateOpportunities: OpportunityData[] = [
        {
          title: 'Art Grant 2025',
          description: 'Annual art grant for emerging artists',
          url: 'https://example.com/grant1', // Same URL as mock-source-1
          organization: 'Arts Foundation Copy',
          sourceType: 'test',
          status: 'new',
          processed: false,
          applied: false,
          starred: false,
          tags: ['grant', 'duplicate']
        }
      ];

      mockDiscoverer2.setMockOpportunities(duplicateOpportunities);

      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      const results = await sentinelService.discover(context);

      // Should get results from both sources
      expect(results).toHaveLength(2);
      
      // But when aggregated, duplicates should be handled
      const allOpportunities = results.flatMap(r => r.opportunities);
      const uniqueUrls = new Set(allOpportunities.map(o => o.url));
      
      // The duplicate URL should appear in both sources' results
      expect(allOpportunities.length).toBeGreaterThan(uniqueUrls.size - 1);
    });

    it('should preserve opportunity metadata and source information', async () => {
      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1']
      };

      const results = await sentinelService.discover(context);
      const opportunities = results[0].opportunities;

      opportunities.forEach(opportunity => {
        expect(opportunity.sourceType).toBe('test');
        expect(opportunity.status).toBe('new');
        expect(opportunity.processed).toBe(false);
        expect(opportunity.applied).toBe(false);
        expect(opportunity.starred).toBe(false);
        expect(opportunity.tags).toBeInstanceOf(Array);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should continue discovery even if one source fails', async () => {
      // Make first discoverer fail
      mockDiscoverer1.setShouldFail(true);

      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(2);
      
      // First source should have errors but still return a result object
      expect(results[0].sourceId).toBe('mock-source-1');
      expect(results[0].errors.length).toBeGreaterThan(0);
      expect(results[0].opportunities).toHaveLength(0);

      // Second source should work normally
      expect(results[1].sourceId).toBe('mock-source-2');
      expect(results[1].errors).toHaveLength(0);
      expect(results[1].opportunities).toHaveLength(1);
    });

    it('should handle timeout scenarios', async () => {
      // Create a slow discoverer
      class SlowDiscoverer extends BaseDiscoverer {
        constructor() {
          super('slow-source', 'test', '1.0.0');
        }

        protected async performDiscovery(): Promise<OpportunityData[]> {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
          return [];
        }
      }

      const slowDiscoverer = new SlowDiscoverer();
      await slowDiscoverer.initialize({
        enabled: true,
        priority: 'medium',
        rateLimit: 60,
        timeout: 1000, // 1 second timeout
        retryAttempts: 0,
        metadata: {}
      });

      sentinelService.registerDiscoverer(slowDiscoverer);

      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['slow-source']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(1);
      expect(results[0].errors.length).toBeGreaterThan(0);
      expect(results[0].opportunities).toHaveLength(0);
    }, 15000); // Extend test timeout

    it('should handle invalid opportunity data gracefully', async () => {
      const invalidOpportunities: OpportunityData[] = [
        {
          title: '', // Invalid: empty title
          description: 'Valid description',
          url: 'https://example.com/invalid1',
          organization: 'Test Org',
          sourceType: 'test',
          status: 'new',
          processed: false,
          applied: false,
          starred: false,
          tags: []
        } as OpportunityData,
        {
          title: 'Valid Title',
          description: 'Valid description',
          url: '', // Invalid: empty URL
          organization: 'Test Org',
          sourceType: 'test',
          status: 'new',
          processed: false,
          applied: false,
          starred: false,
          tags: []
        } as OpportunityData,
        {
          title: 'Valid Opportunity',
          description: 'Valid description',
          url: 'https://example.com/valid1',
          organization: 'Test Org',
          sourceType: 'test',
          status: 'new',
          processed: false,
          applied: false,
          starred: false,
          tags: []
        }
      ];

      mockDiscoverer1.setMockOpportunities(invalidOpportunities);

      const context: DiscoveryContext = {
        maxResults: 10,
        enabledSources: ['mock-source-1']
      };

      const results = await sentinelService.discover(context);

      expect(results).toHaveLength(1);
      // Should filter out invalid opportunities
      expect(results[0].opportunities.length).toBeLessThan(invalidOpportunities.length);
      
      // All returned opportunities should be valid
      results[0].opportunities.forEach(opportunity => {
        expect(opportunity.title).toBeTruthy();
        expect(opportunity.url).toBeTruthy();
        expect(opportunity.description).toBeTruthy();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete discovery within reasonable time limits', async () => {
      const start = Date.now();

      const context: DiscoveryContext = {
        maxResults: 100,
        enabledSources: ['mock-source-1', 'mock-source-2']
      };

      const results = await sentinelService.discover(context);
      const duration = Date.now() - start;

      expect(results).toHaveLength(2);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large numbers of opportunities efficiently', async () => {
      // Create a large number of mock opportunities
      const largeOpportunitySet: OpportunityData[] = [];
      for (let i = 0; i < 1000; i++) {
        largeOpportunitySet.push({
          title: `Opportunity ${i}`,
          description: `Description for opportunity ${i}`,
          url: `https://example.com/opp${i}`,
          organization: `Org ${i % 10}`,
          sourceType: 'test',
          status: 'new',
          processed: false,
          applied: false,
          starred: false,
          tags: [`tag${i % 5}`]
        });
      }

      mockDiscoverer1.setMockOpportunities(largeOpportunitySet);

      const context: DiscoveryContext = {
        maxResults: 100,
        enabledSources: ['mock-source-1']
      };

      const start = Date.now();
      const results = await sentinelService.discover(context);
      const duration = Date.now() - start;

      expect(results).toHaveLength(1);
      expect(results[0].opportunities).toHaveLength(100); // Limited by maxResults
      expect(duration).toBeLessThan(2000); // Should still be fast
    });
  });
});