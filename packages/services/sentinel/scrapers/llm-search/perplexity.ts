import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';

/**
 * Perplexity AI search integration for discovering opportunities
 * Uses Perplexity's search API to find and extract opportunity information
 */
export class PerplexityDiscoverer extends BaseDiscoverer {
  private apiKey: string = '';
  private baseUrl: string = 'https://api.perplexity.ai';
  private model: string = 'llama-3.1-sonar-small-128k-online';
  
  constructor() {
    super('perplexity', 'websearch', '1.0.0');
  }
  
  protected async onInitialize(): Promise<void> {
    this.apiKey = this.config.metadata?.apiKey || process.env.PERPLEXITY_API_KEY || '';
    this.model = this.config.metadata?.model || 'llama-3.1-sonar-small-128k-online';
    
    if (!this.apiKey) {
      throw new Error('Perplexity API key is required');
    }
  }
  
  protected async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a health check.'
            }
          ],
          max_tokens: 10
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Perplexity health check failed:', error);
      return false;
    }
  }
  
  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const searchTerms = context?.searchTerms || this.getDefaultSearchTerms();
    const maxResults = context?.maxResults || 30;
    
    console.log(`Perplexity discovery with terms: ${searchTerms.join(', ')}`);
    
    // Create targeted search queries
    const searchQueries = this.generateSearchQueries(searchTerms, context);
    
    for (const query of searchQueries.slice(0, 5)) { // Limit to 5 queries
      try {
        const queryOpportunities = await this.searchOpportunities(query, maxResults / 5);
        opportunities.push(...queryOpportunities);
      } catch (error) {
        console.error(`Error with Perplexity query "${query}":`, error);
      }
    }
    
    console.log(`Perplexity found ${opportunities.length} opportunities`);
    return opportunities;
  }
  
  /**
   * Search for opportunities using Perplexity AI
   */
  private async searchOpportunities(query: string, maxResults: number): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    try {
      const searchPrompt = this.buildSearchPrompt(query, maxResults);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at finding and extracting information about artist opportunities, grants, and residencies. Always provide current, accurate information with proper URLs and details.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.3,
          search_domain_filter: [
            'artistcommunities.org',
            'foundationcenter.org',
            'grants.gov',
            'artopportunitiesmonthly.com',
            'callforentry.org',
            'arts.gov',
            'cca.gov',
            'artscouncil.org.uk'
          ],
          return_citations: true,
          return_images: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      const citations = result.citations || [];
      
      if (content) {
        const extractedOpportunities = await this.parseOpportunitiesFromResponse(content, citations, query);
        opportunities.push(...extractedOpportunities);
      }
      
    } catch (error) {
      console.error(`Perplexity search error:`, error);
    }
    
    return opportunities;
  }
  
  /**
   * Build search prompt for Perplexity
   */
  private buildSearchPrompt(query: string, maxResults: number): string {
    const currentYear = new Date().getFullYear();
    
    return `Find ${maxResults} current artist opportunities, grants, residencies, or competitions related to: ${query}
    
Please search for opportunities that are:
- Currently open or opening soon in ${currentYear}
- Available to visual artists, sculptors, painters, or multimedia artists
- Include specific details like deadlines, funding amounts, and application requirements

For each opportunity you find, provide:
1. **Title**: The exact name of the opportunity
2. **Organization**: Who is offering it
3. **Description**: What the opportunity offers (be specific about medium, requirements, benefits)
4. **Deadline**: Application deadline (if available)
5. **Amount**: Funding amount or value (if specified)
6. **Location**: Where it's based or if it's virtual/international
7. **URL**: Direct link to the opportunity
8. **Tags**: Relevant categories (grant, residency, competition, etc.)

Format your response as a structured list with clear sections for each opportunity. Include all available details and ensure URLs are accurate and current.

Focus on legitimate, well-established opportunities from reputable organizations, foundations, and institutions.`;
  }
  
  /**
   * Parse opportunities from Perplexity response
   */
  private async parseOpportunitiesFromResponse(
    content: string, 
    citations: any[], 
    searchQuery: string
  ): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    
    try {
      // Split content into opportunity sections
      const sections = this.splitIntoOpportunitySections(content);
      
      for (const section of sections) {
        const opportunity = await this.extractOpportunityFromSection(section, citations, searchQuery);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
      
    } catch (error) {
      console.error('Error parsing Perplexity response:', error);
    }
    
    return opportunities;
  }
  
  /**
   * Split content into individual opportunity sections
   */
  private splitIntoOpportunitySections(content: string): string[] {
    const sections: string[] = [];
    
    // Split by numbered items or clear separators
    const patterns = [
      /\d+\.\s*\*\*([^*]+)\*\*/g, // Numbered with bold titles
      /\*\*([^*]+)\*\*\s*-/g,     // Bold titles with dashes
      /#{1,3}\s+([^\n]+)/g        // Markdown headers
    ];
    
    let bestSplit: string[] = [];
    
    for (const pattern of patterns) {
      const matches = content.split(pattern);
      if (matches.length > bestSplit.length) {
        bestSplit = matches.filter(section => section.trim().length > 100); // Minimum content length
      }
    }
    
    // If no good split found, try paragraph-based splitting
    if (bestSplit.length < 2) {
      bestSplit = content.split(/\n\s*\n/).filter(section => 
        section.trim().length > 100 && 
        (section.includes('http') || section.includes('deadline') || section.includes('grant'))
      );
    }
    
    return bestSplit;
  }
  
  /**
   * Extract opportunity data from a content section
   */
  private async extractOpportunityFromSection(
    section: string, 
    citations: any[], 
    searchQuery: string
  ): Promise<OpportunityData | null> {
    try {
      const title = this.extractField(section, ['title', 'name'], /\*\*([^*]+)\*\*/);
      const organization = this.extractField(section, ['organization', 'foundation', 'sponsor']);
      const description = this.extractDescription(section);
      const deadline = this.extractDeadline(section);
      const amount = this.extractAmount(section);
      const location = this.extractField(section, ['location', 'based', 'country']);
      const url = this.extractURL(section, citations);
      
      // Validate required fields
      if (!title || title.length < 5 || !description || description.length < 30 || !url) {
        return null;
      }
      
      const opportunity: OpportunityData = {
        title: this.cleanText(title),
        description: this.cleanText(description),
        url: url,
        organization: organization ? this.cleanText(organization) : undefined,
        deadline,
        amount: amount ? this.cleanText(amount) : undefined,
        location: location ? this.cleanText(location) : undefined,
        tags: this.generateTags(section, searchQuery),
        sourceType: 'websearch',
        sourceUrl: 'https://api.perplexity.ai',
        sourceMetadata: {
          searchQuery,
          extractedAt: new Date().toISOString(),
          model: this.model,
          contentLength: section.length
        },
        processed: false,
        status: 'new',
        applied: false,
        starred: false
      };
      
      return opportunity;
      
    } catch (error) {
      console.error('Error extracting opportunity from section:', error);
      return null;
    }
  }
  
  /**
   * Extract a specific field from content using patterns
   */
  private extractField(content: string, fieldNames: string[], customPattern?: RegExp): string | undefined {
    if (customPattern) {
      const match = content.match(customPattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    for (const fieldName of fieldNames) {
      const patterns = [
        new RegExp(`\\*\\*${fieldName}\\*\\*:?\\s*([^\\n*]+)`, 'i'),
        new RegExp(`${fieldName}:?\\s*([^\\n]+)`, 'i'),
        new RegExp(`^${fieldName}\\s*([^\\n]+)`, 'im')
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract description from content
   */
  private extractDescription(content: string): string {
    // Remove markdown formatting and extract descriptive text
    let description = content
      .replace(/\*\*[^*]+\*\*/g, '') // Remove bold text
      .replace(/\*[^*]+\*/g, '')     // Remove italic text
      .replace(/#+\s+/g, '')         // Remove headers
      .replace(/\n+/g, ' ')          // Replace newlines with spaces
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();
    
    // Extract sentences that contain descriptive words
    const sentences = description.split(/[.!?]+/).filter(sentence => {
      const s = sentence.toLowerCase();
      return sentence.length > 20 && (
        s.includes('artist') || s.includes('grant') || s.includes('residency') ||
        s.includes('opportunity') || s.includes('application') || s.includes('award')
      );
    });
    
    return sentences.slice(0, 3).join('. ').trim() + '.';
  }
  
  /**
   * Extract deadline from content
   */
  private extractDeadline(content: string): Date | undefined {
    const patterns = [
      /deadline:?\s*([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
      /due:?\s*([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
      /apply by:?\s*([A-Za-z]+ \d{1,2},?\s*\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date;
        }
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract funding amount from content
   */
  private extractAmount(content: string): string | undefined {
    const patterns = [
      /\$[\d,]+(?:\.\d{2})?/,
      /(\d{1,3}(?:,\d{3})*)\s*(?:dollars?|USD)/i,
      /award:?\s*\$?([\d,]+)/i,
      /funding:?\s*\$?([\d,]+)/i,
      /up to\s*\$?([\d,]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0]) {
        return match[0];
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract URL from content or citations
   */
  private extractURL(content: string, citations: any[]): string | undefined {
    // First try to find URL in content
    const urlPattern = /https?:\/\/[^\s\)]+/g;
    const matches = content.match(urlPattern);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    // Try to find relevant citation
    if (citations && citations.length > 0) {
      // Return first citation URL as fallback
      return citations[0].url || citations[0].link;
    }
    
    return undefined;
  }
  
  /**
   * Generate relevant tags based on content
   */
  private generateTags(content: string, searchQuery: string): string[] {
    const tags: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Add tags based on search query
    if (searchQuery.toLowerCase().includes('grant')) tags.push('grant');
    if (searchQuery.toLowerCase().includes('residency')) tags.push('residency');
    if (searchQuery.toLowerCase().includes('fellowship')) tags.push('fellowship');
    
    // Add tags based on content analysis
    const tagKeywords = {
      'grant': ['grant', 'funding', 'financial'],
      'residency': ['residency', 'studio', 'workspace'],
      'fellowship': ['fellowship', 'scholar'],
      'competition': ['competition', 'contest', 'prize'],
      'exhibition': ['exhibition', 'show', 'gallery'],
      'emerging-artist': ['emerging', 'early career'],
      'international': ['international', 'global']
    };
    
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword)) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();
  }
  
  /**
   * Generate search queries based on terms and context
   */
  private generateSearchQueries(searchTerms: string[], context?: DiscoveryContext): string[] {
    const queries: string[] = [];
    const currentYear = new Date().getFullYear();
    
    // Base queries from search terms
    for (const term of searchTerms) {
      queries.push(`${term} ${currentYear} open applications`);
    }
    
    // Add location-specific queries if provided
    if (context?.location) {
      queries.push(`artist grants ${context.location} ${currentYear}`);
      queries.push(`art residencies ${context.location}`);
    }
    
    // Add general opportunity queries
    queries.push(`new artist grants ${currentYear}`);
    queries.push(`art funding opportunities ${currentYear}`);
    queries.push(`creative fellowships ${currentYear}`);
    
    return queries;
  }
  
  /**
   * Get default search terms
   */
  private getDefaultSearchTerms(): string[] {
    return [
      'artist grants',
      'art residencies',
      'creative fellowships',
      'art competitions',
      'artist opportunities'
    ];
  }
}