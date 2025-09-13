import { describe, test, expect } from '@jest/globals';
import { deduplicationService } from '../../services/deduplication/DeduplicationService';
import { OpportunityData } from '../../types/opportunity';

describe('DeduplicationService', () => {
  const mockOpportunities: OpportunityData[] = [
    {
      title: 'Artist Residency Program 2024',
      description: 'A fantastic 3-month artist residency program for emerging artists in New York',
      url: 'https://example.com/residency-1',
      organization: 'New York Arts Foundation',
      deadline: new Date('2024-06-15'),
      amount: '$5,000',
      location: 'New York, NY',
      requirements: ['Portfolio submission', 'Artist statement'],
      category: 'residency',
      tags: ['contemporary-art', 'emerging-artist'],
      rawContent: 'Full residency program content...',
      scrapingMethod: 'firecrawl' as const,
      scrapedAt: new Date(),
      success: true,
      userId: 'user-123'
    },
    {
      title: 'Artist Residency Program 2024 - Applications Open',
      description: 'An amazing 3-month artist residency program for emerging artists located in New York City',
      url: 'https://different-site.com/artist-residency',
      organization: 'New York Arts Foundation',
      deadline: new Date('2024-06-16'),
      amount: '$5000',
      location: 'New York City, NY',
      requirements: ['Portfolio', 'Artist statement', 'CV'],
      category: 'residency',
      tags: ['contemporary', 'emerging'],
      rawContent: 'Similar residency program content...',
      scrapingMethod: 'playwright' as const,
      scrapedAt: new Date(),
      success: true,
      userId: 'user-123'
    },
    {
      title: 'Photography Grant 2024',
      description: 'Support for photographers working on documentary projects',
      url: 'https://photo-foundation.org/grant',
      organization: 'Photography Foundation',
      deadline: new Date('2024-07-01'),
      amount: '$10,000',
      location: 'Nationwide',
      requirements: ['Project proposal', '20 sample images'],
      category: 'grant',
      tags: ['photography', 'documentary'],
      rawContent: 'Photography grant details...',
      scrapingMethod: 'cheerio' as const,
      scrapedAt: new Date(),
      success: true,
      userId: 'user-123'
    }
  ];

  describe('detectDuplicates', () => {
    test('should identify similar opportunities as duplicates', async () => {
      const result = await deduplicationService.detectDuplicates(mockOpportunities);

      expect(result.originalCount).toBe(3);
      expect(result.uniqueCount).toBe(2); // Should detect first two as duplicates
      expect(result.duplicateGroups.length).toBe(1);
      expect(result.duplicateGroups[0].duplicateCount).toBe(1);
      expect(result.duplicateGroups[0].opportunities.length).toBe(2);
      expect(result.duplicateDetectionRate).toBeGreaterThan(0);
    });

    test('should select the primary opportunity correctly', async () => {
      const result = await deduplicationService.detectDuplicates(mockOpportunities);

      // Should have one duplicate group
      const group = result.duplicateGroups[0];
      expect(group.primaryOpportunity).toBeDefined();
      expect(group.primaryOpportunity.organization).toBe('New York Arts Foundation');
    });

    test('should handle empty opportunities array', async () => {
      const result = await deduplicationService.detectDuplicates([]);

      expect(result.originalCount).toBe(0);
      expect(result.uniqueCount).toBe(0);
      expect(result.duplicateGroups.length).toBe(0);
      expect(result.duplicateDetectionRate).toBe(0);
    });

    test('should handle single opportunity', async () => {
      const result = await deduplicationService.detectDuplicates([mockOpportunities[0]]);

      expect(result.originalCount).toBe(1);
      expect(result.uniqueCount).toBe(1);
      expect(result.duplicateGroups.length).toBe(0);
      expect(result.duplicateDetectionRate).toBe(0);
    });

    test('should respect custom similarity thresholds', async () => {
      // Very high threshold should not find duplicates
      const result = await deduplicationService.detectDuplicates(mockOpportunities, undefined, {
        titleSimilarityThreshold: 0.99,
        descriptionSimilarityThreshold: 0.99
      });

      expect(result.uniqueCount).toBe(3); // No duplicates found with high threshold
      expect(result.duplicateGroups.length).toBe(0);
    });

    test('should require organization match when configured', async () => {
      const opportunitiesDifferentOrgs = [
        { ...mockOpportunities[0], organization: 'Org A' },
        { ...mockOpportunities[1], organization: 'Org B' }
      ];

      const result = await deduplicationService.detectDuplicates(
        opportunitiesDifferentOrgs, 
        undefined, 
        { organizationMatchRequired: true }
      );

      expect(result.uniqueCount).toBe(2); // Should not be duplicates due to different orgs
      expect(result.duplicateGroups.length).toBe(0);
    });

    test('should handle opportunities with missing fields', async () => {
      const incompleteOpportunities = [
        {
          title: 'Basic Opportunity',
          description: 'Simple description',
          url: 'https://example.com/basic',
          rawContent: 'Basic content',
          scrapingMethod: 'cheerio' as const,
          scrapedAt: new Date(),
          success: true,
          userId: 'user-123'
        },
        {
          title: 'Another Basic Opportunity',
          description: 'Different description',
          url: 'https://example.com/another',
          rawContent: 'Another content',
          scrapingMethod: 'playwright' as const,
          scrapedAt: new Date(),
          success: true,
          userId: 'user-123'
        }
      ];

      const result = await deduplicationService.detectDuplicates(incompleteOpportunities);

      expect(result.originalCount).toBe(2);
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('performance with large datasets', () => {
    test('should handle 50+ opportunities efficiently', async () => {
      // Generate 50 opportunities with some duplicates
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...mockOpportunities[0],
        title: `Opportunity ${Math.floor(i / 5)}`, // Group every 5 as potential duplicates
        url: `https://example.com/opp-${i}`,
        userId: 'user-123'
      }));

      const startTime = Date.now();
      const result = await deduplicationService.detectDuplicates(largeDataset);
      const processingTime = Date.now() - startTime;

      expect(result.originalCount).toBe(50);
      expect(result.processingTime).toBeLessThan(5000); // Should complete under 5 seconds
      expect(processingTime).toBeLessThan(5000);
      expect(result.duplicateGroups.length).toBeGreaterThan(0); // Should find some duplicates
    });
  });
});