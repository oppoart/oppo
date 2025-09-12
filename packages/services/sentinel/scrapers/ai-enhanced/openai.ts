import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * OpenAI API configuration
 */
interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  costTracking: boolean;
}

/**
 * OpenAI extraction result
 */
interface OpenAIExtractionResult {
  opportunities: OpportunityData[];
  confidence: number;
  reasoning: string;
  tokensUsed: number;
  estimatedCost: number;
}

/**
 * Content source for AI analysis
 */
interface ContentSource {
  url: string;
  title: string;
  content: string;
  contentType: 'html' | 'text' | 'pdf' | 'json';
  metadata?: Record<string, any>;
}

/**
 * OpenAI-powered extraction for unstructured content
 * Uses GPT models to extract and identify opportunities from various content types
 */
export class OpenAIDiscoverer extends BaseDiscoverer {
  private aiConfig: OpenAIConfig;
  private dataCleaner: DataCleaner;
  private totalCost: number = 0;
  private totalTokens: number = 0;

  constructor() {
    super('openai-extraction', 'websearch', '1.0.0');
    
    this.aiConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo-preview', // or 'gpt-3.5-turbo' for cost efficiency
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.1, // Low temperature for consistent extraction
      maxTokens: 4000,
      timeout: 30000,
      costTracking: true
    };

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 150,
      maxDescriptionLength: 2000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing OpenAI discoverer...');
    
    if (!this.aiConfig.apiKey) {
      throw new Error('OpenAI API key is required (OPENAI_API_KEY)');
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Simple API health check
      const response = await fetch(`${this.aiConfig.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;

    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 30;

    console.log(`Starting OpenAI-powered discovery (max results: ${maxResults})`);

    try {
      // Get content sources to analyze
      const contentSources = await this.getContentSources(context);
      console.log(`Analyzing ${contentSources.length} content sources with OpenAI`);

      // Process content sources in batches to manage token usage
      const batchSize = 3; // Process 3 sources at a time
      
      for (let i = 0; i < contentSources.length; i += batchSize) {
        const batch = contentSources.slice(i, i + batchSize);
        
        try {
          const batchResults = await this.processBatchWithOpenAI(batch, context);
          
          for (const result of batchResults) {
            if (result.opportunities.length > 0) {
              opportunities.push(...result.opportunities);
              
              // Log AI usage stats
              if (this.aiConfig.costTracking) {
                this.totalTokens += result.tokensUsed;
                this.totalCost += result.estimatedCost;
                
                console.log(
                  `OpenAI usage - Tokens: ${result.tokensUsed}, ` +
                  `Cost: $${result.estimatedCost.toFixed(4)}, ` +
                  `Total: $${this.totalCost.toFixed(4)}`
                );
              }
            }
          }
          
          // Stop if we have enough results
          if (opportunities.length >= maxResults) {
            break;
          }
          
          // Rate limiting between batches
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`Failed to process batch starting at index ${i}:`, error);
        }
      }

      console.log(`OpenAI discovery completed: ${opportunities.length} opportunities found`);
      console.log(`Total AI cost: $${this.totalCost.toFixed(4)}, Total tokens: ${this.totalTokens}`);
      
      return opportunities.slice(0, maxResults);

    } catch (error) {
      console.error('OpenAI discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get content sources for AI analysis
   */
  private async getContentSources(context?: DiscoveryContext): Promise<ContentSource[]> {
    // In a real implementation, this would:
    // 1. Query recent web searches, RSS feeds, or bookmarks
    // 2. Get content from failed/low-quality scraping attempts
    // 3. Analyze user-submitted URLs
    // 4. Process email newsletters or documents
    
    // For now, return example sources that would benefit from AI extraction
    const sources: ContentSource[] = [
      {
        url: 'https://www.arts.gov/grants',
        title: 'National Endowment for the Arts Grants',
        content: `The National Endowment for the Arts supports artistic excellence, creativity, and innovation for the benefit of individuals and communities. We provide leadership in arts education.

        Current Grant Opportunities:
        
        Art Works Grants: Support the creation of art that meets the highest standards of excellence, public engagement with diverse and excellent art, lifelong learning in the arts, and the strengthening of communities through the arts.
        
        Application Deadline: February 11, 2024
        Award Amount: $10,000 - $100,000
        
        Our Town Grants: Support projects that strengthen communities through creative placemaking projects.
        
        Application Deadline: August 10, 2024
        Award Amount: $25,000 - $200,000
        
        Challenge America Grants: Support projects that extend the reach of the arts to underserved populations.
        
        Application Deadline: May 13, 2024
        Award Amount: $10,000`,
        contentType: 'html',
        metadata: { source: 'government', domain: 'arts.gov' }
      },
      
      {
        url: 'https://www.guggenheim.org/grants-fellowships',
        title: 'Guggenheim Foundation Fellowships',
        content: `The John Simon Guggenheim Memorial Foundation offers Fellowships to further the development of scholars and artists by assisting them to engage in research in any field of knowledge and creation in any of the arts, under the freest possible conditions and irrespective of race, color, or creed.
        
        The Foundation receives approximately 3,000 applications each year. Although no one who applies is guaranteed success in the competition, the Foundation takes great care to be fair and thorough in its review process.
        
        2024 Fellowship Competition
        
        Application opens: July 15, 2024
        Application deadline: September 17, 2024
        
        Fellows are selected on the basis of prior achievement and exceptional promise. The average grant is approximately $60,000.
        
        Eligible fields include: Fine Arts, Photography, Video, Film, Choreography, Music Composition, Theatre Arts, Literature, and more.`,
        contentType: 'html',
        metadata: { source: 'foundation', domain: 'guggenheim.org' }
      }
    ];

    // Add context-specific sources if search terms are provided
    if (context?.searchTerms) {
      // In a real implementation, these would be dynamically fetched
      sources.push({
        url: 'https://example-art-foundation.org/grants',
        title: 'Example Art Foundation - Special Grants',
        content: `We are pleased to announce our 2024 grant opportunities for emerging artists working in digital media, sculpture, and installation art.

        Digital Innovation Grant
        For artists exploring technology in their practice
        Deadline: March 15, 2024
        Amount: $5,000 - $25,000
        
        Sculpture Excellence Award
        Supporting traditional and contemporary sculptural practices
        Deadline: April 20, 2024
        Amount: $10,000 - $50,000
        
        Community Installation Project
        Public art installations that engage local communities
        Deadline: June 30, 2024
        Amount: $15,000 - $100,000`,
        contentType: 'text',
        metadata: { source: 'foundation' }
      });
    }

    return sources;
  }

  /**
   * Process a batch of content sources with OpenAI
   */
  private async processBatchWithOpenAI(
    sources: ContentSource[],
    context?: DiscoveryContext
  ): Promise<OpenAIExtractionResult[]> {
    const results: OpenAIExtractionResult[] = [];

    for (const source of sources) {
      try {
        console.log(`Processing with OpenAI: ${source.title}`);
        
        const result = await this.extractOpportunitiesWithOpenAI(source, context);
        results.push(result);
        
        // Small delay between individual requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`OpenAI processing failed for ${source.title}:`, error);
        
        // Add empty result to maintain batch structure
        results.push({
          opportunities: [],
          confidence: 0,
          reasoning: `Processing failed: ${error}`,
          tokensUsed: 0,
          estimatedCost: 0
        });
      }
    }

    return results;
  }

  /**
   * Extract opportunities from a content source using OpenAI
   */
  private async extractOpportunitiesWithOpenAI(
    source: ContentSource,
    context?: DiscoveryContext
  ): Promise<OpenAIExtractionResult> {
    const prompt = this.buildExtractionPrompt(source, context);
    
    try {
      const response = await fetch(`${this.aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at identifying and extracting artist opportunities (grants, fellowships, residencies, jobs, competitions, exhibitions) from various types of content. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.aiConfig.temperature,
          max_tokens: this.aiConfig.maxTokens,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(this.aiConfig.timeout)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      const content = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
      
      // Parse the JSON response
      const extractedData = JSON.parse(content);
      
      // Process each opportunity
      const opportunities: OpportunityData[] = [];
      
      if (extractedData.opportunities && Array.isArray(extractedData.opportunities)) {
        for (const oppData of extractedData.opportunities) {
          try {
            // Convert to OpportunityData format
            const opportunity: OpportunityData = {
              title: oppData.title || '',
              description: oppData.description || '',
              url: oppData.url || source.url,
              organization: oppData.organization || this.extractDomainName(source.url),
              deadline: oppData.deadline ? new Date(oppData.deadline) : undefined,
              amount: oppData.amount,
              location: oppData.location,
              tags: oppData.tags || [],
              sourceType: 'websearch',
              sourceMetadata: {
                aiExtracted: true,
                aiService: 'openai',
                aiModel: this.aiConfig.model,
                confidence: oppData.confidence || extractedData.confidence,
                sourceUrl: source.url,
                extractedAt: new Date().toISOString(),
                tokensUsed: tokensUsed
              }
            };

            // Clean the opportunity data
            const cleaningResult = await this.dataCleaner.clean(opportunity);
            
            if (cleaningResult.success && cleaningResult.data) {
              opportunities.push(cleaningResult.data);
            }
            
          } catch (error) {
            console.warn(`Failed to process extracted opportunity:`, error);
          }
        }
      }

      return {
        opportunities,
        confidence: extractedData.confidence || 0.5,
        reasoning: extractedData.reasoning || 'No reasoning provided',
        tokensUsed,
        estimatedCost: this.calculateTokenCost(tokensUsed)
      };

    } catch (error) {
      console.error('OpenAI extraction failed:', error);
      
      return {
        opportunities: [],
        confidence: 0,
        reasoning: `Extraction failed: ${error}`,
        tokensUsed: 0,
        estimatedCost: 0
      };
    }
  }

  /**
   * Build extraction prompt for OpenAI
   */
  private buildExtractionPrompt(source: ContentSource, context?: DiscoveryContext): string {
    let contextInfo = '';
    
    if (context?.searchTerms) {
      contextInfo += `\nSearch context: Looking for opportunities related to: ${context.searchTerms.join(', ')}`;
    }
    
    if (context?.location) {
      contextInfo += `\nLocation preference: ${context.location}`;
    }

    return `Please analyze the following content and extract any artist opportunities (grants, fellowships, residencies, jobs, competitions, exhibitions, calls for art).

Source: ${source.title}
URL: ${source.url}
Content Type: ${source.contentType}
${contextInfo}

Content:
${source.content}

For each opportunity found, extract:
- title: Clear, descriptive title
- description: Detailed description of the opportunity
- organization: Organization offering the opportunity
- deadline: Application deadline (ISO date format if possible)
- amount: Funding amount or salary if mentioned
- location: Geographic location or "Remote" if applicable
- url: Specific application URL or the source URL
- tags: Relevant tags/categories
- confidence: Your confidence in this being a valid opportunity (0.0-1.0)

Respond with JSON in this format:
{
  "opportunities": [
    {
      "title": "string",
      "description": "string",
      "organization": "string", 
      "deadline": "YYYY-MM-DD or null",
      "amount": "string or null",
      "location": "string or null",
      "url": "string",
      "tags": ["array", "of", "strings"],
      "confidence": 0.9
    }
  ],
  "confidence": 0.8,
  "reasoning": "Brief explanation of what was found and extraction confidence"
}

Only extract opportunities that are clearly for artists, creatives, or arts organizations. Be strict about quality and relevance.`;
  }

  /**
   * Calculate estimated token cost
   */
  private calculateTokenCost(tokens: number): number {
    // GPT-4 pricing (approximate, as of 2024)
    const inputCostPer1k = 0.03;
    const outputCostPer1k = 0.06;
    
    // Assume roughly 2/3 input, 1/3 output
    const inputTokens = Math.floor(tokens * 0.67);
    const outputTokens = Math.floor(tokens * 0.33);
    
    const inputCost = (inputTokens / 1000) * inputCostPer1k;
    const outputCost = (outputTokens / 1000) * outputCostPer1k;
    
    return inputCost + outputCost;
  }

  /**
   * Extract domain name from URL
   */
  private extractDomainName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get AI usage statistics
   */
  getUsageStats(): { totalCost: number; totalTokens: number } {
    return {
      totalCost: this.totalCost,
      totalTokens: this.totalTokens
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.totalCost = 0;
    this.totalTokens = 0;
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 20, // Conservative rate limit for API costs
      timeout: 35000, // 35 seconds for AI processing
      retryAttempts: 2
    };
  }
}