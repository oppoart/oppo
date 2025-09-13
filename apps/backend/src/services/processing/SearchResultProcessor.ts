import { PrismaClient } from '@prisma/client';
import { webScraperService } from '../scraper/WebScraperService';

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
  date?: string;
  position: number;
}

export interface ProcessingResult {
  id: string;
  originalResult: RawSearchResult;
  processed: boolean;
  scrapedData?: any;
  extractedOpportunity?: ExtractedOpportunity;
  qualityScore: number;
  processingTimeMs: number;
  error?: string;
}

export interface ExtractedOpportunity {
  title: string;
  description: string;
  url: string;
  organization?: string;
  deadline?: Date;
  amount?: string;
  location?: string;
  requirements: string[];
  category: string;
  tags: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  applicationInfo?: {
    applicationUrl?: string;
    applicationDeadline?: Date;
    submissionMethod?: string;
  };
  metadata: {
    sourceType: string;
    discoveredAt: Date;
    processingMethod: string;
    confidence: number;
  };
}

export interface ProcessingOptions {
  enableScraping?: boolean;
  scrapingTimeout?: number;
  qualityThreshold?: number;
  maxConcurrent?: number;
  enableContentExtraction?: boolean;
  enableMetadataEnrichment?: boolean;
}

/**
 * Search Result Processing Pipeline
 * Converts raw search results into structured opportunity data
 */
export class SearchResultProcessor {
  private prisma: PrismaClient;
  private processingQueue: RawSearchResult[] = [];
  private activeProcessing = new Map<string, ProcessingResult>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Process batch of search results
   */
  async processBatch(
    results: RawSearchResult[], 
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    console.log(`📊 Processing batch of ${results.length} search results`);
    
    const {
      enableScraping = true,
      qualityThreshold = 40,
      maxConcurrent = 3,
      enableContentExtraction = true,
      enableMetadataEnrichment = true
    } = options;

    const processedResults: ProcessingResult[] = [];
    
    // Filter out low-quality results first
    const qualityResults = results.filter(result => 
      this.calculateInitialQuality(result) >= qualityThreshold
    );

    console.log(`🔍 ${qualityResults.length}/${results.length} results passed initial quality filter`);

    // Process in batches to avoid overwhelming services
    const batches = this.chunkArray(qualityResults, maxConcurrent);
    
    for (const batch of batches) {
      const batchPromises = batch.map(result => 
        this.processSingleResult(result, {
          enableScraping,
          enableContentExtraction,
          enableMetadataEnrichment,
          scrapingTimeout: options.scrapingTimeout || 10000
        })
      );

      const batchResults = await Promise.all(batchPromises);
      processedResults.push(...batchResults.filter(r => r !== null) as ProcessingResult[]);

      // Small delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Processing complete: ${processedResults.length} results processed successfully`);
    
    return processedResults;
  }

  /**
   * Process single search result
   */
  private async processSingleResult(
    result: RawSearchResult,
    options: ProcessingOptions
  ): Promise<ProcessingResult | null> {
    const startTime = Date.now();
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const processingResult: ProcessingResult = {
      id: processingId,
      originalResult: result,
      processed: false,
      qualityScore: 0,
      processingTimeMs: 0
    };

    try {
      console.log(`🔄 Processing: ${result.title}`);

      // Step 1: Calculate comprehensive quality score
      processingResult.qualityScore = this.calculateQualityScore(result);
      
      if (processingResult.qualityScore < 30) {
        console.log(`⏭️  Skipping low-quality result: ${result.title} (score: ${processingResult.qualityScore})`);
        return null;
      }

      // Step 2: Scrape content if enabled and looks promising
      if (options.enableScraping && processingResult.qualityScore > 50) {
        try {
          const scrapeResult = await Promise.race([
            webScraperService.scrapeOpportunity(result.url),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Scraping timeout')), options.scrapingTimeout || 10000)
            )
          ]) as any;

          if (scrapeResult.success) {
            processingResult.scrapedData = scrapeResult.opportunity;
            console.log(`🕷️  Successfully scraped: ${result.title}`);
          } else {
            console.log(`⚠️  Scraping failed for: ${result.title} - ${scrapeResult.error}`);
          }
        } catch (error) {
          console.log(`⚠️  Scraping error for ${result.title}: ${error}`);
        }
      }

      // Step 3: Extract structured opportunity data
      if (options.enableContentExtraction) {
        processingResult.extractedOpportunity = this.extractOpportunityData(
          result, 
          processingResult.scrapedData
        );
      }

      // Step 4: Enrich with metadata
      if (options.enableMetadataEnrichment && processingResult.extractedOpportunity) {
        await this.enrichOpportunityMetadata(processingResult.extractedOpportunity);
      }

      processingResult.processed = true;
      processingResult.processingTimeMs = Date.now() - startTime;
      
      console.log(`✅ Processed: ${result.title} (${processingResult.processingTimeMs}ms)`);
      
      return processingResult;

    } catch (error) {
      processingResult.error = error instanceof Error ? error.message : 'Unknown error';
      processingResult.processingTimeMs = Date.now() - startTime;
      
      console.error(`❌ Processing failed for ${result.title}:`, error);
      return processingResult;
    }
  }

  /**
   * Calculate initial quality score for filtering
   */
  private calculateInitialQuality(result: RawSearchResult): number {
    let score = 50;
    
    // Domain quality
    if (result.domain) {
      const goodDomains = ['.org', '.edu', '.gov', '.foundation', 'arts', 'gallery', 'museum'];
      if (goodDomains.some(domain => result.domain!.includes(domain))) {
        score += 25;
      }
      
      const badDomains = ['pinterest', 'facebook', 'twitter', 'linkedin', 'youtube'];
      if (badDomains.some(domain => result.domain!.includes(domain))) {
        score -= 40;
      }
    }
    
    // Title quality
    const title = result.title.toLowerCase();
    const goodTitleWords = ['grant', 'residency', 'exhibition', 'fellowship', 'opportunity', 'call for', 'artists'];
    const titleMatches = goodTitleWords.filter(word => title.includes(word)).length;
    score += titleMatches * 8;
    
    // Snippet quality
    const snippet = result.snippet.toLowerCase();
    const goodSnippetWords = ['apply', 'submit', 'deadline', 'funding', 'artists', 'art', 'creative'];
    const snippetMatches = goodSnippetWords.filter(word => snippet.includes(word)).length;
    score += snippetMatches * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate comprehensive quality score
   */
  private calculateQualityScore(result: RawSearchResult): number {
    const initialScore = this.calculateInitialQuality(result);
    let comprehensiveScore = initialScore;
    
    // URL quality indicators
    const url = result.url.toLowerCase();
    if (url.includes('/grants/') || url.includes('/residency/') || url.includes('/opportunities/')) {
      comprehensiveScore += 15;
    }
    
    if (url.includes('/apply') || url.includes('/submission') || url.includes('/call-for')) {
      comprehensiveScore += 10;
    }
    
    // Content length quality
    if (result.snippet.length > 100 && result.snippet.length < 500) {
      comprehensiveScore += 10;
    }
    
    // Title specificity
    if (result.title.length > 30 && result.title.length < 120) {
      comprehensiveScore += 5;
    }
    
    return Math.max(0, Math.min(100, comprehensiveScore));
  }

  /**
   * Extract structured opportunity data
   */
  private extractOpportunityData(
    result: RawSearchResult, 
    scrapedData?: any
  ): ExtractedOpportunity {
    const content = scrapedData?.rawContent || result.snippet;
    const title = scrapedData?.title || result.title;
    
    return {
      title: title.substring(0, 255),
      description: this.extractDescription(content, result.snippet),
      url: result.url,
      organization: scrapedData?.organization || this.extractOrganization(content),
      deadline: scrapedData?.deadline || this.extractDeadline(content),
      amount: scrapedData?.amount || this.extractAmount(content),
      location: scrapedData?.location || this.extractLocation(content),
      requirements: scrapedData?.requirements || this.extractRequirements(content),
      category: scrapedData?.category || this.classifyCategory(content),
      tags: scrapedData?.tags || this.extractTags(content),
      contactInfo: {
        email: scrapedData?.contactEmail || this.extractEmail(content),
        phone: this.extractPhone(content),
        address: this.extractAddress(content)
      },
      applicationInfo: {
        applicationUrl: scrapedData?.applicationUrl || this.extractApplicationUrl(content),
        applicationDeadline: scrapedData?.deadline || this.extractDeadline(content),
        submissionMethod: this.extractSubmissionMethod(content)
      },
      metadata: {
        sourceType: 'websearch',
        discoveredAt: new Date(),
        processingMethod: scrapedData ? 'scraped' : 'snippet',
        confidence: this.calculateExtractionConfidence(scrapedData, content)
      }
    };
  }

  private extractDescription(content: string, fallbackSnippet: string): string {
    // Use scraped content if available, otherwise enhance snippet
    if (content && content.length > fallbackSnippet.length) {
      // Extract first paragraph or meaningful description
      const paragraphs = content.split('\n').filter(p => p.trim().length > 50);
      if (paragraphs.length > 0) {
        return paragraphs[0].substring(0, 1500);
      }
    }
    return fallbackSnippet.substring(0, 1000);
  }

  private extractOrganization(content: string): string | undefined {
    const orgPatterns = [
      /(?:by|from|hosted by)\s+([^\\n,.]+(?:foundation|institute|gallery|museum|center|council|arts|university|college))/i,
      /([A-Z][^\\n,.]+(?:Foundation|Institute|Gallery|Museum|Center|Council|Arts|University|College))/i
    ];

    for (const pattern of orgPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }
    return undefined;
  }

  private extractDeadline(content: string): Date | undefined {
    const deadlinePatterns = [
      /deadline[:\s]+([^\\n,.]+)/i,
      /due[:\s]+([^\\n,.]+)/i,
      /closes[:\s]+([^\\n,.]+)/i,
      /apply by[:\s]+([^\\n,.]+)/i,
      /submissions? due[:\s]+([^\\n,.]+)/i
    ];

    for (const pattern of deadlinePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private extractAmount(content: string): string | undefined {
    const amountPatterns = [
      /\$[\d,]+(?:\.\d{2})?/g,
      /€[\d,]+(?:\.\d{2})?/g,
      /£[\d,]+(?:\.\d{2})?/g,
      /(?:up to|prize of|award of|funding of)\s*\$?([\d,]+)/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].trim();
      }
    }
    return undefined;
  }

  private extractLocation(content: string): string | undefined {
    const locationPatterns = [
      /location[:\s]+([^\\n,.]+)/i,
      /(?:in|at)\s+([A-Z][a-z]+,\s*[A-Z]{2,})/,
      /([A-Z][a-z]+,\s*[A-Z][a-z]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 100);
      }
    }
    return undefined;
  }

  private extractRequirements(content: string): string[] {
    const requirements = [];
    const reqPatterns = [
      /(?:requirements?|eligibility|must|criteria)[:\s]*([^]*?)(?:\\n\\n|\\n[A-Z])/i,
      /(?:applicants? must|to qualify|to be eligible)[:\s]*([^\\n]+)/gi
    ];

    for (const pattern of reqPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const lines = match.split('\\n').filter(line => line.trim().length > 10);
          requirements.push(...lines.slice(0, 3).map(line => line.trim().substring(0, 200)));
        }
      }
    }

    return requirements.slice(0, 5);
  }

  private classifyCategory(content: string): string {
    const text = content.toLowerCase();
    
    if (text.includes('grant') || text.includes('funding')) return 'grant';
    if (text.includes('residency') || text.includes('residence')) return 'residency';
    if (text.includes('exhibition') || text.includes('show')) return 'exhibition';
    if (text.includes('fellowship')) return 'fellowship';
    if (text.includes('competition') || text.includes('contest')) return 'competition';
    if (text.includes('award') || text.includes('prize')) return 'award';
    if (text.includes('call for artists') || text.includes('call for entries')) return 'call-for-artists';
    
    return 'other';
  }

  private extractTags(content: string): string[] {
    const tags = [];
    const text = content.toLowerCase();
    
    const tagKeywords = [
      'contemporary', 'emerging', 'established', 'international', 'national',
      'digital art', 'painting', 'sculpture', 'photography', 'performance',
      'installation', 'new media', 'experimental', 'conceptual', 'multimedia'
    ];

    for (const keyword of tagKeywords) {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    }

    return tags.slice(0, 8);
  }

  private extractEmail(content: string): string | undefined {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/;
    const match = content.match(emailPattern);
    return match?.[0];
  }

  private extractPhone(content: string): string | undefined {
    const phonePatterns = [
      /\\(?\\d{3}\\)?[-.\s]?\\d{3}[-.\s]?\\d{4}/,
      /\\+\\d{1,3}[-.\s]?\\d{3,}[-.\s]?\\d{3,}[-.\s]?\\d{3,}/
    ];

    for (const pattern of phonePatterns) {
      const match = content.match(pattern);
      if (match) return match[0];
    }
    return undefined;
  }

  private extractAddress(content: string): string | undefined {
    const addressPattern = /\\d+\\s+[A-Z][^\\n]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)[^\\n]*/i;
    const match = content.match(addressPattern);
    return match?.[0];
  }

  private extractApplicationUrl(content: string): string | undefined {
    const urlPattern = /https?:\/\/[^\s]+(?:apply|application|submit)/i;
    const match = content.match(urlPattern);
    return match?.[0];
  }

  private extractSubmissionMethod(content: string): string | undefined {
    const text = content.toLowerCase();
    
    if (text.includes('online') || text.includes('digital submission')) return 'online';
    if (text.includes('email') || text.includes('e-mail')) return 'email';
    if (text.includes('mail') || text.includes('postal')) return 'mail';
    if (text.includes('hand deliver') || text.includes('in person')) return 'in-person';
    
    return undefined;
  }

  private calculateExtractionConfidence(scrapedData: any, content: string): number {
    let confidence = 70; // Base confidence
    
    if (scrapedData) confidence += 20; // Scraped data is more reliable
    if (content.length > 500) confidence += 10; // More content = better extraction
    if (this.extractDeadline(content)) confidence += 5;
    if (this.extractAmount(content)) confidence += 5;
    if (this.extractOrganization(content)) confidence += 5;
    
    return Math.min(100, confidence);
  }

  /**
   * Enrich opportunity metadata with external data
   */
  private async enrichOpportunityMetadata(opportunity: ExtractedOpportunity): Promise<void> {
    try {
      // Add domain-based metadata
      const domain = new URL(opportunity.url).hostname;
      
      // Classify source credibility
      if (domain.includes('.org') || domain.includes('.edu') || domain.includes('.gov')) {
        opportunity.metadata.confidence += 10;
      }
      
      // Add domain-specific tags
      if (domain.includes('arts')) opportunity.tags.push('arts-organization');
      if (domain.includes('foundation')) opportunity.tags.push('foundation');
      if (domain.includes('museum')) opportunity.tags.push('museum');
      if (domain.includes('gallery')) opportunity.tags.push('gallery');
      
    } catch (error) {
      console.error('Metadata enrichment failed:', error);
    }
  }

  /**
   * Store processed opportunities in database
   */
  async storeOpportunities(processedResults: ProcessingResult[]): Promise<number> {
    let stored = 0;
    
    for (const result of processedResults) {
      if (!result.extractedOpportunity || result.qualityScore < 60) continue;
      
      try {
        const opportunity = result.extractedOpportunity;
        
        // Check if already exists
        const existing = await this.prisma.opportunity.findFirst({
          where: { url: opportunity.url }
        });
        
        if (!existing) {
          await this.prisma.opportunity.create({
            data: {
              title: opportunity.title,
              description: opportunity.description,
              url: opportunity.url,
              organization: opportunity.organization,
              deadline: opportunity.deadline,
              amount: opportunity.amount,
              location: opportunity.location,
              tags: opportunity.tags,
              sourceType: opportunity.metadata.sourceType,
              sourceUrl: opportunity.url,
              relevanceScore: opportunity.metadata.confidence / 100,
              processed: true,
              sourceMetadata: {
                processingId: result.id,
                qualityScore: result.qualityScore,
                extractionMethod: opportunity.metadata.processingMethod,
                confidence: opportunity.metadata.confidence,
                extractedData: {
                  requirements: opportunity.requirements,
                  contactInfo: opportunity.contactInfo,
                  applicationInfo: opportunity.applicationInfo
                }
              }
            }
          });
          stored++;
        }
      } catch (error) {
        console.error(`Failed to store opportunity "${result.extractedOpportunity?.title}":`, error);
      }
    }
    
    console.log(`💾 Stored ${stored} new opportunities in database`);
    return stored;
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): { 
    activeProcessing: number;
    queueLength: number;
    totalProcessed: number;
  } {
    return {
      activeProcessing: this.activeProcessing.size,
      queueLength: this.processingQueue.length,
      totalProcessed: 0 // Would track this in production
    };
  }
}

export const searchResultProcessor = new SearchResultProcessor(new PrismaClient());