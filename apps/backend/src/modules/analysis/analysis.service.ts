import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService } from '../scraper/scraper.service';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  domain?: string;
  date?: string;
}

interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  deadline?: string;
  eligibility?: string;
  amount?: string;
  type?: string;
  scraped: boolean;
  error?: string;
  position?: number;
}

interface AnalysisResult {
  relevanceScore: number;
  category: string;
  tags: string[];
  summary: string;
  keyDetails: {
    deadline?: string;
    amount?: string;
    eligibility?: string;
    location?: string;
  };
}

export interface ScrapeAndAnalyzeResponse {
  success: boolean;
  data?: {
    query: string;
    scrapeResults: {
      total: number;
      successful: number;
      failed: number;
      results: Array<ScrapeResult & { analysis?: AnalysisResult }>;
    };
    analysisResults: {
      total: number;
      highRelevance: number;
      mediumRelevance: number;
      lowRelevance: number;
      averageRelevance: number;
    };
    saveResults: {
      saved: number;
      duplicates: number;
      failed: number;
      duplicateUrls: string[];
    };
  };
  meta?: {
    processedAt: string;
    totalProcessingTime: number;
  };
  error?: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: ScraperService
  ) {}

  async scrapeAndAnalyze(
    searchResults: SearchResult[], 
    query: string, 
    profileId: string
  ): Promise<ScrapeAndAnalyzeResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting scrape and analysis for ${searchResults.length} results for profile ${profileId}`);
      
      // Real scraping implementation using ScraperService
      const scrapeResults = await this.realScrapeResults(searchResults);
      
      // Mock analysis implementation - in production this would use AI/ML models
      const analysisResults = await this.mockAnalyzeResults(scrapeResults, profileId);
      
      // Save scraped opportunities to database
      const saveResults = await this.saveOpportunitiesToDatabase(analysisResults, query, profileId);
      
      const totalProcessingTime = Date.now() - startTime;
      
      this.logger.log(`Completed scrape and analysis in ${totalProcessingTime}ms. Saved ${saveResults.saved.length} new opportunities, ${saveResults.duplicateUrls.length} duplicates detected, ${saveResults.failedUrls.length} failed saves`);
      
      return {
        success: true,
        data: {
          query,
          scrapeResults: {
            total: scrapeResults.length,
            successful: scrapeResults.filter(r => r.scraped).length,
            failed: scrapeResults.filter(r => !r.scraped).length,
            results: analysisResults
          },
          analysisResults: {
            total: analysisResults.length,
            highRelevance: analysisResults.filter(r => r.analysis && r.analysis.relevanceScore > 0.7).length,
            mediumRelevance: analysisResults.filter(r => r.analysis && r.analysis.relevanceScore > 0.4 && r.analysis.relevanceScore <= 0.7).length,
            lowRelevance: analysisResults.filter(r => r.analysis && r.analysis.relevanceScore <= 0.4).length,
            averageRelevance: analysisResults.reduce((sum, r) => sum + (r.analysis?.relevanceScore || 0), 0) / analysisResults.length
          },
          saveResults: {
            saved: saveResults.saved.length,
            duplicates: saveResults.duplicateUrls.length,
            failed: saveResults.failedUrls.length,
            duplicateUrls: saveResults.duplicateUrls
          }
        },
        meta: {
          processedAt: new Date().toISOString(),
          totalProcessingTime
        }
      };
    } catch (error) {
      this.logger.error('Scrape and analysis failed', error);
      return {
        success: false,
        error: error.message || 'Scraping and analysis failed',
        meta: {
          processedAt: new Date().toISOString(),
          totalProcessingTime: Date.now() - startTime
        }
      };
    }
  }

  private async realScrapeResults(searchResults: SearchResult[]): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];
    
    this.logger.log(`Starting real scraping of ${searchResults.length} URLs`);
    
    for (const result of searchResults) {
      try {
        const scrapedContent = await this.scraperService.scrapeUrl(result.link, {
          title: result.title,
          snippet: result.snippet
        });

        if (scrapedContent.success) {
          results.push({
            url: result.link,
            title: scrapedContent.title,
            content: scrapedContent.content,
            deadline: scrapedContent.deadline,
            eligibility: scrapedContent.eligibility,
            amount: scrapedContent.amount,
            type: this.determineOpportunityType(scrapedContent.title),
            scraped: true,
            position: result.position
          });
          
          this.logger.log(`✅ Successfully scraped: ${scrapedContent.title.substring(0, 50)}...`);
        } else {
          results.push({
            url: result.link,
            title: result.title,
            content: scrapedContent.content,
            scraped: false,
            error: scrapedContent.error || 'Scraping failed',
            position: result.position
          });
          
          this.logger.warn(`❌ Failed to scrape: ${result.link} - ${scrapedContent.error}`);
        }
      } catch (error) {
        this.logger.error(`Error scraping ${result.link}:`, error);
        results.push({
          url: result.link,
          title: result.title,
          content: 'Failed to scrape content due to unexpected error',
          scraped: false,
          error: error.message,
          position: result.position
        });
      }
    }
    
    this.logger.log(`Scraping completed: ${results.filter(r => r.scraped).length}/${results.length} successful`);
    return results;
  }

  private async mockScrapeResults(searchResults: SearchResult[]): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];
    
    for (const result of searchResults) {
      // Always succeed for real Google results (they have proper domains)
      const isRealResult = result.domain && !result.domain.includes('example');
      const scraped = isRealResult ? true : Math.random() > 0.1; // 100% for real results, 90% for mocks
      
      if (scraped) {
        results.push({
          url: result.link,
          title: result.title,
          content: `Mock scraped content for ${result.title}. This opportunity offers funding for artists working in contemporary mediums. Application deadlines vary by program. Eligibility requirements include portfolio submission and artist statement.`,
          deadline: this.generateRandomDeadline(),
          eligibility: 'Emerging and mid-career artists',
          amount: this.generateRandomAmount(),
          type: this.determineOpportunityType(result.title),
          scraped: true,
          position: result.position // Add position for sourceMetadata tracking
        });
      } else {
        results.push({
          url: result.link,
          title: result.title,
          content: '',
          scraped: false,
          error: 'Website blocking or rate limiting',
          position: result.position // Add position for sourceMetadata tracking
        });
      }
    }
    
    return results;
  }

  private async mockAnalyzeResults(scrapeResults: ScrapeResult[], profileId?: string): Promise<Array<ScrapeResult & { analysis?: AnalysisResult }>> {
    return scrapeResults.map(result => ({
      ...result,
      analysis: result.scraped ? {
        relevanceScore: 0.7 + (Math.random() * 0.3), // Always between 0.7 and 1.0 for real search results
        category: this.categorizeOpportunity(result.type || 'unknown'),
        tags: this.generateTags(result.title, result.content),
        summary: `AI-analyzed opportunity: ${result.title.substring(0, 100)}...`,
        keyDetails: {
          deadline: result.deadline,
          amount: result.amount,
          eligibility: result.eligibility,
          location: 'Various locations'
        }
      } : undefined
    }));
  }

  private generateRandomDeadline(): string {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.random() * 120); // Random date within next 4 months
    return futureDate.toISOString().split('T')[0];
  }

  private generateRandomAmount(): string {
    const amounts = ['$500-$5,000', '$1,000-$10,000', '$5,000-$25,000', '$10,000-$50,000', 'Varies', 'Not specified'];
    return amounts[Math.floor(Math.random() * amounts.length)];
  }

  private determineOpportunityType(title: string): string {
    const types = {
      'grant': ['grant', 'funding', 'award'],
      'residency': ['residency', 'residence'],
      'exhibition': ['exhibition', 'show', 'gallery'],
      'fellowship': ['fellowship', 'program'],
      'competition': ['competition', 'contest', 'call']
    };

    const titleLower = title.toLowerCase();
    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return type;
      }
    }
    return 'opportunity';
  }

  private categorizeOpportunity(type: string): string {
    const categories = {
      'grant': 'Funding',
      'residency': 'Residencies',
      'exhibition': 'Exhibitions',
      'fellowship': 'Education',
      'competition': 'Competitions'
    };
    return categories[type] || 'General';
  }

  private generateTags(title: string, content: string): string[] {
    const commonTags = ['contemporary art', 'emerging artists', 'visual arts', 'funding', 'professional development'];
    const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
    return [...new Set([...commonTags.slice(0, 2), ...titleWords.slice(0, 3)])];
  }

  private async saveOpportunitiesToDatabase(
    analysisResults: Array<ScrapeResult & { analysis?: AnalysisResult }>,
    query: string,
    profileId: string
  ) {
    const savedOpportunities = [];
    const duplicateUrls = [];
    const failedSaves = [];
    
    for (const result of analysisResults) {
      if (!result.scraped || !result.analysis) {
        continue; // Skip failed scrapes or unanalyzed results
      }

      try {
        // Check if opportunity already exists by URL to avoid duplicates
        const existingOpportunity = await this.prisma.opportunity.findFirst({
          where: { url: result.url }
        });

        if (existingOpportunity) {
          this.logger.debug(`Opportunity already exists: ${result.url}`);
          duplicateUrls.push(result.url);
          continue;
        }

        // Parse deadline string to DateTime
        let deadlineDate = null;
        if (result.deadline) {
          try {
            deadlineDate = new Date(result.deadline);
          } catch (error) {
            this.logger.warn(`Failed to parse deadline: ${result.deadline}`);
          }
        }

        // Create the opportunity
        const opportunity = await this.prisma.opportunity.create({
          data: {
            title: result.title,
            description: result.content,
            url: result.url,
            deadline: deadlineDate,
            amount: result.amount,
            location: result.analysis.keyDetails.location,
            tags: result.analysis.tags,
            
            // Discovery System Fields
            sourceType: 'websearch',
            sourceUrl: result.url,
            sourceMetadata: {
              originalQuery: query,
              searchPosition: result.position || 0,
              scrapeTimestamp: new Date().toISOString(),
            },
            
            // Processing Fields
            relevanceScore: result.analysis.relevanceScore,
            processed: true,
            aiServiceUsed: 'mock-service', // In production this would be the actual AI service
            
            // Status
            status: 'new',
            applied: false,
            starred: false,
          },
        });

        savedOpportunities.push(opportunity);
        this.logger.debug(`Saved opportunity: ${opportunity.title} (ID: ${opportunity.id})`);
        
      } catch (error) {
        this.logger.error(`Failed to save opportunity: ${result.title}`, error);
        failedSaves.push(result.url);
      }
    }
    
    return {
      saved: savedOpportunities,
      duplicateUrls,
      failedUrls: failedSaves
    };
  }

  async getOpportunities(filters: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    minRelevanceScore?: number;
    deadlineBefore?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        type,
        minRelevanceScore,
        deadlineBefore
      } = filters;

      const offset = (page - 1) * limit;

      // Build where clause for filtering
      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ];
      }

      if (type && type !== 'all') {
        // Map frontend types to database tags
        const typeKeywords = {
          'grant': ['grant', 'funding', 'award'],
          'residency': ['residency', 'residence'],
          'exhibition': ['exhibition', 'show', 'gallery'],
          'fellowship': ['fellowship', 'program'],
          'competition': ['competition', 'contest', 'call']
        };
        
        const keywords = typeKeywords[type as keyof typeof typeKeywords];
        if (keywords) {
          where.tags = {
            some: {
              in: keywords
            }
          };
        }
      }

      if (minRelevanceScore !== undefined) {
        where.relevanceScore = { gte: minRelevanceScore };
      }

      if (deadlineBefore) {
        where.deadline = { lte: new Date(deadlineBefore) };
      }

      const [opportunities, total] = await Promise.all([
        this.prisma.opportunity.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            title: true,
            description: true,
            url: true,
            deadline: true,
            amount: true,
            location: true,
            tags: true,
            sourceType: true,
            sourceUrl: true,
            relevanceScore: true,
            status: true,
            applied: true,
            starred: true,
            createdAt: true,
            lastUpdated: true,
          },
        }),
        this.prisma.opportunity.count({ where }),
      ]);

      // Transform database records to match frontend interface
      const transformedOpportunities = opportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        source: opp.sourceType,
        url: opp.url,
        deadline: opp.deadline?.toISOString(),
        location: opp.location,
        type: this.determineOpportunityTypeFromTags(opp.tags),
        relevanceScore: opp.relevanceScore,
        matchingCriteria: opp.tags, // Use tags as matching criteria for now
        createdAt: opp.createdAt.toISOString(),
        updatedAt: opp.lastUpdated.toISOString(),
      }));

      return {
        opportunities: transformedOpportunities,
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to retrieve opportunities', error);
      throw new Error(`Failed to retrieve opportunities: ${error.message}`);
    }
  }

  async getOpportunityById(id: string) {
    try {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          deadline: true,
          amount: true,
          location: true,
          tags: true,
          sourceType: true,
          sourceUrl: true,
          sourceMetadata: true,
          relevanceScore: true,
          processed: true,
          aiServiceUsed: true,
          status: true,
          applied: true,
          starred: true,
          createdAt: true,
          lastUpdated: true,
        },
      });

      if (!opportunity) {
        return null;
      }

      // Transform database record to match frontend interface
      return {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        source: opportunity.sourceType,
        url: opportunity.url,
        deadline: opportunity.deadline?.toISOString(),
        location: opportunity.location,
        amount: opportunity.amount,
        type: this.determineOpportunityTypeFromTags(opportunity.tags),
        relevanceScore: opportunity.relevanceScore,
        matchingCriteria: opportunity.tags, // Use tags as matching criteria for now
        sourceMetadata: opportunity.sourceMetadata,
        processed: opportunity.processed,
        aiServiceUsed: opportunity.aiServiceUsed,
        status: opportunity.status,
        applied: opportunity.applied,
        starred: opportunity.starred,
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.lastUpdated.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve opportunity by ID: ${id}`, error);
      throw new Error(`Failed to retrieve opportunity: ${error.message}`);
    }
  }

  private determineOpportunityTypeFromTags(tags: string[]): 'grant' | 'residency' | 'exhibition' | 'competition' | 'fellowship' | 'other' {
    if (!tags || tags.length === 0) return 'other';
    
    const tagString = tags.join(' ').toLowerCase();
    
    // Check for specific opportunity types in tags
    if (tagString.includes('grant') || tagString.includes('funding')) return 'grant';
    if (tagString.includes('residency') || tagString.includes('residence')) return 'residency';
    if (tagString.includes('exhibition') || tagString.includes('show') || tagString.includes('gallery')) return 'exhibition';
    if (tagString.includes('competition') || tagString.includes('contest')) return 'competition';
    if (tagString.includes('fellowship') || tagString.includes('program')) return 'fellowship';
    
    return 'other';
  }
}
