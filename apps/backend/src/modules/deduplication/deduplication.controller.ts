import { Controller, Post, Body, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface DuplicateGroup {
  id: string;
  opportunities: any[];
  primaryOpportunity: any;
  duplicateCount: number;
  confidence: number;
  reason: string;
  mergedAt: string;
}

@ApiTags('deduplication')
@Controller('deduplication')
export class DeduplicationController {
  private readonly logger = new Logger(DeduplicationController.name);

  @Get('health')
  getHealth() {
    return {
      success: true,
      data: {
        deduplicationAlgorithm: 'similarity-based',
        supportedMethods: ['title-similarity', 'url-domain', 'organization-match'],
        status: 'healthy'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  @Post('detect-duplicates')
  @ApiOperation({ summary: 'Detect duplicates in opportunities' })
  @ApiResponse({ status: 200, description: 'Duplicate detection completed successfully' })
  async detectDuplicates(
    @Body() body: {
      opportunities: any[];
      analysisResults?: any[];
      options?: {
        titleSimilarityThreshold?: number;
        descriptionSimilarityThreshold?: number;
        organizationMatchRequired?: boolean;
        deadlineToleranceDays?: number;
        urlDomainMatching?: boolean;
      };
    }
  ) {
    try {
      this.logger.log(`Detecting duplicates in ${body.opportunities.length} opportunities`);
      const startTime = Date.now();

      const options = {
        titleSimilarityThreshold: body.options?.titleSimilarityThreshold ?? 0.8,
        descriptionSimilarityThreshold: body.options?.descriptionSimilarityThreshold ?? 0.7,
        organizationMatchRequired: body.options?.organizationMatchRequired ?? false,
        deadlineToleranceDays: body.options?.deadlineToleranceDays ?? 3,
        urlDomainMatching: body.options?.urlDomainMatching ?? true,
      };

      const { duplicateGroups, uniqueOpportunities, removedDuplicates } = this.findDuplicates(
        body.opportunities, 
        options
      );

      const processingTime = Date.now() - startTime;
      const duplicateDetectionRate = (duplicateGroups.length / body.opportunities.length) * 100;

      const deduplicationResult = {
        originalCount: body.opportunities.length,
        uniqueCount: uniqueOpportunities.length,
        duplicateGroups,
        removedDuplicates,
        uniqueOpportunities,
        processingTime,
        duplicateDetectionRate
      };

      const statistics = {
        originalCount: body.opportunities.length,
        uniqueCount: uniqueOpportunities.length,
        duplicatesRemoved: removedDuplicates.length,
        duplicateGroups: duplicateGroups.length,
        duplicateRate: (removedDuplicates.length / body.opportunities.length) * 100,
        confidenceLevels: {
          high: duplicateGroups.filter(g => g.confidence > 0.9).length,
          medium: duplicateGroups.filter(g => g.confidence > 0.7 && g.confidence <= 0.9).length,
          low: duplicateGroups.filter(g => g.confidence <= 0.7).length,
        },
        averageGroupSize: duplicateGroups.reduce((sum, g) => sum + g.duplicateCount, 0) / Math.max(duplicateGroups.length, 1)
      };

      return {
        success: true,
        data: {
          deduplication: deduplicationResult,
          statistics
        },
        meta: {
          processingTime,
          processedAt: new Date().toISOString(),
          userId: 'system',
          deduplicationMethod: 'similarity-based'
        }
      };
    } catch (error) {
      this.logger.error('Duplicate detection failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Duplicate detection failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process-pipeline')
  @ApiOperation({ summary: 'Full pipeline processing: scrape, analyze, and deduplicate' })
  @ApiResponse({ status: 200, description: 'Pipeline processing completed successfully' })
  async processPipeline(
    @Body() body: {
      searchResults: any[];
      query: string;
      profileId: string;
      options?: {
        deduplication?: {
          titleSimilarityThreshold?: number;
          descriptionSimilarityThreshold?: number;
          organizationMatchRequired?: boolean;
          deadlineToleranceDays?: number;
          urlDomainMatching?: boolean;
        };
      };
    }
  ) {
    try {
      this.logger.log(`Processing pipeline for ${body.searchResults.length} search results`);
      const startTime = Date.now();

      // Mock scraping results (in real implementation, this would call scraper service)
      const scrapeResults = {
        total: body.searchResults.length,
        successful: Math.floor(body.searchResults.length * 0.8),
        failed: Math.ceil(body.searchResults.length * 0.2)
      };

      // Mock analysis results (in real implementation, this would call analysis service)
      const analysisResults = body.searchResults.map((result, index) => ({
        ...result,
        relevanceScore: Math.random() * 100,
        isOpportunity: Math.random() > 0.5,
        analysisId: `analysis_${index}`
      }));

      // Mock opportunities from analysis
      const opportunities = analysisResults.filter(r => r.isOpportunity);

      // Perform deduplication
      const deduplicationOptions = body.options?.deduplication || {};
      const { duplicateGroups, uniqueOpportunities, removedDuplicates } = this.findDuplicates(
        opportunities, 
        deduplicationOptions
      );

      const deduplicationResult = {
        originalCount: opportunities.length,
        uniqueCount: uniqueOpportunities.length,
        duplicateGroups,
        removedDuplicates,
        uniqueOpportunities,
        processingTime: Date.now() - startTime,
        duplicateDetectionRate: (duplicateGroups.length / opportunities.length) * 100
      };

      const relevantOpportunities = uniqueOpportunities.filter(o => o.relevanceScore > 50);
      const highValueOpportunities = uniqueOpportunities.filter(o => o.relevanceScore > 80);

      const totalProcessingTime = Date.now() - startTime;

      const finalStats = {
        searchResultsProcessed: body.searchResults.length,
        successfullyScrapped: scrapeResults.successful,
        analyzed: analysisResults.length,
        originalOpportunities: opportunities.length,
        duplicatesRemoved: removedDuplicates.length,
        uniqueOpportunities: uniqueOpportunities.length,
        relevantOpportunities: relevantOpportunities.length,
        highValueOpportunities: highValueOpportunities.length,
        finalConversionRate: (highValueOpportunities.length / body.searchResults.length) * 100
      };

      return {
        success: true,
        data: {
          query: body.query,
          scrapeResults,
          analysisResults,
          deduplicationResult,
          relevantOpportunities,
          highValueOpportunities,
          finalStats
        },
        meta: {
          processedAt: new Date().toISOString(),
          totalProcessingTime,
          pipelineSteps: ['scrape', 'analyze', 'deduplicate']
        }
      };
    } catch (error) {
      this.logger.error('Pipeline processing failed', error);
      throw new HttpException(
        {
          success: false,
          message: 'Pipeline processing failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private findDuplicates(
    opportunities: any[],
    options: any
  ): {
    duplicateGroups: DuplicateGroup[];
    uniqueOpportunities: any[];
    removedDuplicates: any[];
  } {
    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();
    const removedDuplicates: any[] = [];

    for (let i = 0; i < opportunities.length; i++) {
      const opportunity = opportunities[i];
      if (processedIds.has(opportunity.id || i.toString())) continue;

      const duplicates: any[] = [];
      const currentId = opportunity.id || i.toString();
      processedIds.add(currentId);

      for (let j = i + 1; j < opportunities.length; j++) {
        const other = opportunities[j];
        const otherId = other.id || j.toString();
        if (processedIds.has(otherId)) continue;

        const similarity = this.calculateSimilarity(opportunity, other, options);
        if (similarity.isDuplicate) {
          duplicates.push(other);
          processedIds.add(otherId);
          removedDuplicates.push(other);
        }
      }

      if (duplicates.length > 0) {
        const group: DuplicateGroup = {
          id: `group_${duplicateGroups.length + 1}`,
          opportunities: [opportunity, ...duplicates],
          primaryOpportunity: opportunity,
          duplicateCount: duplicates.length + 1,
          confidence: duplicates.reduce((sum, d) => sum + this.calculateSimilarity(opportunity, d, options).confidence, 0) / duplicates.length,
          reason: 'Title and content similarity',
          mergedAt: new Date().toISOString()
        };
        duplicateGroups.push(group);
      }
    }

    const uniqueOpportunities = opportunities.filter(opp => 
      !removedDuplicates.some(dup => (dup.id || dup) === (opp.id || opp))
    );

    return { duplicateGroups, uniqueOpportunities, removedDuplicates };
  }

  private calculateSimilarity(opp1: any, opp2: any, options: any): { isDuplicate: boolean; confidence: number } {
    let confidence = 0;
    let matches = 0;
    let totalChecks = 0;

    // Title similarity
    if (opp1.title && opp2.title) {
      const titleSimilarity = this.stringSimilarity(opp1.title, opp2.title);
      if (titleSimilarity > options.titleSimilarityThreshold) {
        matches++;
        confidence += titleSimilarity;
      }
      totalChecks++;
    }

    // URL domain matching
    if (options.urlDomainMatching && opp1.url && opp2.url) {
      const domain1 = this.extractDomain(opp1.url);
      const domain2 = this.extractDomain(opp2.url);
      if (domain1 === domain2) {
        matches++;
        confidence += 0.9;
      }
      totalChecks++;
    }

    // Organization matching
    if (options.organizationMatchRequired && opp1.organization && opp2.organization) {
      if (opp1.organization.toLowerCase() === opp2.organization.toLowerCase()) {
        matches++;
        confidence += 0.95;
      }
      totalChecks++;
    }

    const finalConfidence = totalChecks > 0 ? confidence / totalChecks : 0;
    const isDuplicate = matches >= Math.ceil(totalChecks * 0.6); // At least 60% of checks must match

    return { isDuplicate, confidence: finalConfidence };
  }

  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private extractDomain(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch {
      return '';
    }
  }
}