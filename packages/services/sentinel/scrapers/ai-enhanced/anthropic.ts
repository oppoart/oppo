import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Anthropic Claude API configuration
 */
interface ClaudeConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  costTracking: boolean;
}

/**
 * Claude extraction result
 */
interface ClaudeExtractionResult {
  opportunities: OpportunityData[];
  confidence: number;
  reasoning: string;
  tokensUsed: number;
  estimatedCost: number;
}

/**
 * Content source for Claude analysis
 */
interface ContentSource {
  url: string;
  title: string;
  content: string;
  contentType: 'html' | 'text' | 'pdf' | 'json';
  metadata?: Record<string, any>;
}

/**
 * Claude-powered extraction for unstructured content
 * Uses Anthropic's Claude models for opportunity extraction with different approach than OpenAI
 */
export class AnthropicDiscoverer extends BaseDiscoverer {
  private aiConfig: ClaudeConfig;
  private dataCleaner: DataCleaner;
  private totalCost: number = 0;
  private totalTokens: number = 0;

  constructor() {
    super('claude-extraction', 'websearch', '1.0.0');
    
    this.aiConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-haiku-20240307', // Fast and cost-effective
      baseUrl: 'https://api.anthropic.com/v1',
      maxTokens: 4000,
      temperature: 0.1, // Low temperature for consistent extraction
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
    console.log('Initializing Anthropic Claude discoverer...');
    
    if (!this.aiConfig.apiKey) {
      throw new Error('Anthropic API key is required (ANTHROPIC_API_KEY)');
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Simple API health check with a minimal request
      const response = await fetch(`${this.aiConfig.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.aiConfig.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Hello'
          }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;

    } catch (error) {
      console.error('Claude health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 30;

    console.log(`Starting Claude-powered discovery (max results: ${maxResults})`);

    try {
      // Get content sources to analyze
      const contentSources = await this.getContentSources(context);
      console.log(`Analyzing ${contentSources.length} content sources with Claude`);

      // Process content sources individually (Claude handles context better this way)
      for (let i = 0; i < contentSources.length; i++) {
        try {
          const source = contentSources[i];
          console.log(`Processing with Claude: ${source.title}`);
          
          const result = await this.extractOpportunitiesWithClaude(source, context);
          
          if (result.opportunities.length > 0) {
            opportunities.push(...result.opportunities);
            
            // Log AI usage stats
            if (this.aiConfig.costTracking) {
              this.totalTokens += result.tokensUsed;
              this.totalCost += result.estimatedCost;
              
              console.log(
                `Claude usage - Tokens: ${result.tokensUsed}, ` +
                `Cost: $${result.estimatedCost.toFixed(4)}, ` +
                `Total: $${this.totalCost.toFixed(4)}`
              );
            }
          }
          
          // Stop if we have enough results
          if (opportunities.length >= maxResults) {
            break;
          }
          
          // Rate limiting between requests
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`Failed to process source ${i}:`, error);
        }
      }

      console.log(`Claude discovery completed: ${opportunities.length} opportunities found`);
      console.log(`Total AI cost: $${this.totalCost.toFixed(4)}, Total tokens: ${this.totalTokens}`);
      
      return opportunities.slice(0, maxResults);

    } catch (error) {
      console.error('Claude discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get content sources for Claude analysis
   */
  private async getContentSources(context?: DiscoveryContext): Promise<ContentSource[]> {
    // In a real implementation, this would fetch from various sources
    // For demonstration, using example content that benefits from Claude's reasoning
    const sources: ContentSource[] = [
      {
        url: 'https://www.smithsonian.org/opportunities',
        title: 'Smithsonian Institution Opportunities',
        content: `Smithsonian Institution Fellowship Program

        The Smithsonian Institution Fellowship Program offers unique opportunities to researchers from around the world to visit the Smithsonian for periods ranging from one week to one year.

        Graduate Student Fellowships
        Duration: 10 weeks
        Stipend: $7,000
        Application Deadline: January 15, 2024
        
        The graduate student fellowship supports graduate students pursuing research that requires use of Smithsonian collections or facilities. Projects must demonstrate scholarly merit and significance within the discipline.

        Predoctoral Fellowships
        Duration: 3-12 months
        Stipend: $38,000/year
        Application Deadline: November 15, 2024
        
        These fellowships are intended to provide students with an opportunity to conduct research in association with the Institution's research staff, while completing their dissertations.

        Postdoctoral Fellowships
        Duration: 6-12 months  
        Stipend: $50,000/year
        Application Deadline: November 15, 2024
        
        Postdoctoral fellowships are offered to scholars who have held the PhD or equivalent for fewer than seven years, to pursue independent research related to Smithsonian collections, facilities, and/or research of the staff.

        Senior Fellowships
        Duration: 3-12 months
        Stipend: $50,000/year
        Application Deadline: November 15, 2024
        
        Senior fellowships are intended to provide established scholars with opportunities to pursue independent research related to Smithsonian collections and research interests of the Institution.`,
        contentType: 'html',
        metadata: { source: 'institution', domain: 'smithsonian.org', category: 'fellowship' }
      },
      
      {
        url: 'https://www.creativecapital.org/grants',
        title: 'Creative Capital Foundation',
        content: `Creative Capital supports adventurous artists across the country through funding, counsel, and career development services.

        2024 Grant Guidelines

        Creative Capital provides integrated financial and advisory support to artists pursuing projects in the following disciplines:

        Emerging Fields: Projects that defy traditional artistic boundaries
        Film/Video: Narrative, documentary, and experimental film and video
        Literature: Fiction, nonfiction, poetry, and genre-crossing literary work  
        Performing Arts: Theater, dance, music, opera, and interdisciplinary performance
        Technology: Projects using technology as an artistic medium
        Visual Arts: Painting, sculpture, photography, installation, and new media

        Award Information:
        - Up to $50,000 over two years
        - Multiyear advisory support
        - Access to Creative Capital's network of advisors

        Application Process:
        Letter of Inquiry Due: March 1, 2024
        Full Application Due: June 1, 2024 (by invitation only)

        Eligibility:
        - US-based artists only
        - Individual artists (not organizations)
        - Artists at any career stage
        - Previous grantees are eligible after a 3-year waiting period

        Selection Criteria:
        We support projects that demonstrate artistic excellence, innovation, and the potential for significant impact on the field. We prioritize projects that take creative risks and push boundaries.

        Application Support:
        We offer workshops and office hours to help artists develop strong applications. Virtual information sessions are held monthly.`,
        contentType: 'text',
        metadata: { source: 'foundation', domain: 'creativecapital.org', category: 'grant' }
      },

      {
        url: 'https://www.artforum.com/jobs',
        title: 'Artforum Job Listings',
        content: `Current Opportunities in the Art World

        Museum Curator Position
        Major Contemporary Art Museum seeks experienced curator to lead contemporary art programming. Responsibilities include developing exhibitions, acquiring works for the permanent collection, and managing curatorial staff.

        Location: New York, NY
        Salary: $85,000 - $110,000
        Application Deadline: February 28, 2024
        
        Requirements:
        - PhD in Art History or related field
        - 5+ years curatorial experience
        - Strong exhibition development skills
        - Publications and research background

        Gallery Director - Emerging Artists Program  
        Established gallery seeks director for new emerging artists initiative. Role involves identifying and supporting early-career artists through exhibitions, sales, and career development.

        Location: Los Angeles, CA
        Salary: $75,000 - $95,000
        Benefits: Health, dental, profit sharing
        Application Deadline: March 15, 2024

        Requirements:
        - Art business or curatorial experience
        - Strong network in contemporary art
        - Excellent communication skills
        - Passion for supporting emerging talent

        Arts Administrator - Community Outreach
        Non-profit arts organization seeks administrator to develop and implement community engagement programs. Focus on increasing accessibility and diversity in arts programming.

        Location: Chicago, IL
        Salary: $55,000 - $65,000
        Application Deadline: April 1, 2024

        Art Teacher - High School Position
        Private high school seeks passionate art educator to teach studio art classes and develop new curriculum. Opportunity to shape young artists' creative development.

        Location: San Francisco, CA
        Salary: $60,000 - $70,000
        Application Deadline: May 1, 2024`,
        contentType: 'html',
        metadata: { source: 'publication', domain: 'artforum.com', category: 'jobs' }
      }
    ];

    return sources;
  }

  /**
   * Extract opportunities from content using Claude
   */
  private async extractOpportunitiesWithClaude(
    source: ContentSource,
    context?: DiscoveryContext
  ): Promise<ClaudeExtractionResult> {
    const prompt = this.buildExtractionPrompt(source, context);
    
    try {
      const response = await fetch(`${this.aiConfig.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.aiConfig.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          max_tokens: this.aiConfig.maxTokens,
          temperature: this.aiConfig.temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: AbortSignal.timeout(this.aiConfig.timeout)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.content || data.content.length === 0) {
        throw new Error('No response content from Claude');
      }

      const content = data.content[0].text;
      const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;
      
      // Parse the JSON response
      let extractedData;
      try {
        // Claude sometimes wraps JSON in markdown code blocks
        const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[1]);
        } else {
          extractedData = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Failed to parse Claude JSON response:', content);
        throw new Error(`JSON parsing failed: ${parseError}`);
      }
      
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
                aiService: 'claude',
                aiModel: this.aiConfig.model,
                confidence: oppData.confidence || extractedData.confidence,
                reasoning: oppData.reasoning,
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
            console.warn(`Failed to process Claude-extracted opportunity:`, error);
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
      console.error('Claude extraction failed:', error);
      
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
   * Build extraction prompt optimized for Claude
   */
  private buildExtractionPrompt(source: ContentSource, context?: DiscoveryContext): string {
    let contextInfo = '';
    
    if (context?.searchTerms) {
      contextInfo += `\nSearch context: Looking specifically for opportunities related to: ${context.searchTerms.join(', ')}`;
    }
    
    if (context?.location) {
      contextInfo += `\nLocation preference: ${context.location}`;
    }

    return `I need you to carefully analyze the following content and extract any artist opportunities. Please be thorough and precise in your analysis.

Source Information:
- Title: ${source.title}
- URL: ${source.url}
- Content Type: ${source.contentType}
${contextInfo}

Content to Analyze:
${source.content}

Task: Extract all artist opportunities (grants, fellowships, residencies, jobs, competitions, exhibitions, calls for art) from this content.

For each opportunity you identify, please extract these details:
1. **title**: A clear, descriptive title for the opportunity
2. **description**: A comprehensive description of what the opportunity offers
3. **organization**: The organization or institution providing the opportunity
4. **deadline**: Application deadline (use YYYY-MM-DD format if date is clear, otherwise null)
5. **amount**: Any funding amount, salary, or stipend mentioned (include currency/range if specified)
6. **location**: Where the opportunity is based (city, state, country) or "Remote" if applicable
7. **url**: The application URL if different from source, otherwise use source URL
8. **tags**: Relevant categories (e.g., "grant", "fellowship", "sculpture", "emerging-artist")
9. **confidence**: Your confidence that this is a legitimate artist opportunity (0.0 to 1.0)
10. **reasoning**: Brief explanation of why you classified this as an opportunity

Guidelines:
- Only extract opportunities clearly intended for artists, curators, or arts professionals
- Be strict about relevance - exclude general academic or non-arts opportunities
- If dates are ambiguous or unclear, set deadline to null
- For salary ranges, include the full range in the amount field
- Include both direct opportunities and opportunities that artists would qualify for

Please respond with a JSON object in this exact format:

\`\`\`json
{
  "opportunities": [
    {
      "title": "Opportunity Title",
      "description": "Detailed description...",
      "organization": "Organization Name",
      "deadline": "2024-03-15",
      "amount": "$50,000",
      "location": "New York, NY",
      "url": "https://example.com/apply",
      "tags": ["grant", "visual-arts", "emerging-artist"],
      "confidence": 0.95,
      "reasoning": "Clear artist grant with specific eligibility and application process"
    }
  ],
  "confidence": 0.9,
  "reasoning": "Overall assessment of content quality and extraction confidence"
}
\`\`\`

Take your time to thoroughly analyze the content and extract all relevant opportunities.`;
  }

  /**
   * Calculate estimated token cost for Claude
   */
  private calculateTokenCost(tokens: number): number {
    // Claude 3 Haiku pricing (as of 2024)
    const inputCostPer1k = 0.00025;  // $0.25 per million tokens
    const outputCostPer1k = 0.00125; // $1.25 per million tokens
    
    // Rough estimate: 70% input, 30% output
    const inputTokens = Math.floor(tokens * 0.7);
    const outputTokens = Math.floor(tokens * 0.3);
    
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

  /**
   * Compare with other AI services (for A/B testing)
   */
  async compareWithOpenAI(source: ContentSource, context?: DiscoveryContext): Promise<{
    claude: ClaudeExtractionResult;
    comparison: {
      claudeAdvantages: string[];
      openaiAdvantages: string[];
      recommendation: 'claude' | 'openai' | 'both';
    };
  }> {
    const claudeResult = await this.extractOpportunitiesWithClaude(source, context);
    
    // This would integrate with OpenAI service for comparison
    // For now, return Claude results with analysis framework
    
    return {
      claude: claudeResult,
      comparison: {
        claudeAdvantages: [
          'Better reasoning and context understanding',
          'More careful about false positives',
          'Better handling of complex, multi-part content',
          'Lower cost per token'
        ],
        openaiAdvantages: [
          'Faster processing',
          'More consistent JSON formatting',
          'Better at handling structured data extraction'
        ],
        recommendation: claudeResult.confidence > 0.8 ? 'claude' : 'both'
      }
    };
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 15, // Conservative rate limit for API costs
      timeout: 40000, // 40 seconds for Claude's thoughtful processing
      retryAttempts: 2
    };
  }
}