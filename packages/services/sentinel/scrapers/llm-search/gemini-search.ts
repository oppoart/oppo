import { BaseDiscoverer } from '../../core/BaseDiscoverer';
import { DiscoveryContext } from '../../core/interfaces';
import { OpportunityData } from '../../../../../apps/backend/src/types/discovery';
import { DataExtractor, RawData } from '../../processors/DataExtractor';
import { DataCleaner } from '../../processors/DataCleaner';

/**
 * Google Custom Search result
 */
interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
  formattedUrl: string;
  htmlTitle?: string;
  htmlSnippet?: string;
  cacheId?: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    metatags?: Array<{
      [key: string]: string;
    }>;
  };
}

interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
    nextPage?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
  context: {
    title: string;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items: GoogleSearchResult[];
}

/**
 * Gemini AI analysis result
 */
interface GeminiAnalysis {
  isOpportunity: boolean;
  relevanceScore: number;
  opportunityType: string;
  extractedInfo: {
    title?: string;
    organization?: string;
    deadline?: string;
    amount?: string;
    location?: string;
    description?: string;
    tags?: string[];
  };
  reasoning: string;
  confidence: number;
}

/**
 * Configuration for Google Search + Gemini
 */
interface GeminiSearchConfig {
  googleApiKey: string;
  googleCxId: string;
  geminiApiKey: string;
  maxResultsPerQuery: number;
  useGeminiFiltering: boolean;
  geminiModel: string;
  timeout: number;
  dateRestrict: string; // e.g., 'm1' for past month
}

/**
 * Google Search with Gemini AI integration
 * Combines Google Custom Search with Gemini AI for intelligent opportunity detection
 */
export class GeminiSearchDiscoverer extends BaseDiscoverer {
  private searchConfig: GeminiSearchConfig;
  private dataExtractor: DataExtractor;
  private dataCleaner: DataCleaner;

  constructor() {
    super('gemini-search', 'websearch', '1.0.0');
    
    this.searchConfig = {
      googleApiKey: process.env.GOOGLE_API_KEY || '',
      googleCxId: process.env.GOOGLE_CX_ID || '',
      geminiApiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '',
      maxResultsPerQuery: 10,
      useGeminiFiltering: true,
      geminiModel: 'gemini-1.5-flash',
      timeout: 20000,
      dateRestrict: 'm3' // Past 3 months
    };

    this.dataExtractor = new DataExtractor({
      enabled: true,
      timeout: 10000,
      extractImages: false,
      extractLinks: true
    });

    this.dataCleaner = new DataCleaner({
      enabled: true,
      maxTitleLength: 150,
      maxDescriptionLength: 2000
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Initializing Gemini Search discoverer...');
    
    if (!this.searchConfig.googleApiKey) {
      throw new Error('Google API key is required (GOOGLE_API_KEY)');
    }
    
    if (!this.searchConfig.googleCxId) {
      throw new Error('Google Custom Search Engine ID is required (GOOGLE_CX_ID)');
    }
    
    if (!this.searchConfig.geminiApiKey) {
      throw new Error('Gemini API key is required (GOOGLE_AI_API_KEY or GEMINI_API_KEY)');
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Test Google Custom Search API
      const testQuery = 'test';
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.searchConfig.googleApiKey}&cx=${this.searchConfig.googleCxId}&q=${encodeURIComponent(testQuery)}&num=1`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.error('Google Search API health check failed:', response.status);
        return false;
      }

      // Test Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.searchConfig.geminiModel}:generateContent?key=${this.searchConfig.geminiApiKey}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello'
            }]
          }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      return geminiResponse.ok;

    } catch (error) {
      console.error('Gemini Search health check failed:', error);
      return false;
    }
  }

  protected async performDiscovery(context?: DiscoveryContext): Promise<OpportunityData[]> {
    const opportunities: OpportunityData[] = [];
    const maxResults = context?.maxResults || 50;

    console.log(`Starting Gemini Search discovery (max results: ${maxResults})`);

    try {
      // Generate intelligent search queries
      const queries = this.generateSmartSearchQueries(context);
      console.log(`Generated ${queries.length} intelligent search queries`);

      // Execute searches
      const allSearchResults: GoogleSearchResult[] = [];
      
      for (const query of queries) {
        try {
          console.log(`Searching: "${query}"`);
          const results = await this.executeGoogleSearch(query);
          
          // Use Gemini to pre-filter results if enabled
          if (this.searchConfig.useGeminiFiltering) {
            const filteredResults = await this.geminiFilterResults(results, query);
            allSearchResults.push(...filteredResults);
          } else {
            allSearchResults.push(...results);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1100)); // Google's rate limit
          
        } catch (error) {
          console.warn(`Search query failed: "${query}"`, error);
        }
      }

      console.log(`Total search results collected: ${allSearchResults.length}`);

      // Remove duplicates
      const uniqueResults = this.deduplicateResults(allSearchResults);
      console.log(`Unique search results: ${uniqueResults.length}`);

      // Convert results to opportunities with Gemini enhancement
      for (let i = 0; i < uniqueResults.length && opportunities.length < maxResults; i++) {
        try {
          const opportunity = await this.convertWithGeminiAnalysis(uniqueResults[i], context);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.warn(`Failed to process search result ${i + 1}:`, error);
        }

        // Rate limiting for content fetching and AI analysis
        if (i % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Gemini Search discovery completed: ${opportunities.length} opportunities found`);
      return opportunities;

    } catch (error) {
      console.error('Gemini Search discovery failed:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent search queries using context
   */
  private generateSmartSearchQueries(context?: DiscoveryContext): string[] {
    const baseQueries = [
      'artist grant application deadline 2024 2025',
      'visual arts fellowship funding opportunity',
      'art residency program open call',
      'emerging artist grant competition',
      'creative arts funding deadline',
      'artist opportunity exhibition call'
    ];

    const queries: string[] = [...baseQueries];

    // Add context-specific queries
    if (context?.searchTerms && context.searchTerms.length > 0) {
      context.searchTerms.forEach(term => {
        queries.push(`"${term}" artist grant opportunity`);
        queries.push(`"${term}" art fellowship deadline`);
      });
    }

    // Add location-specific queries
    if (context?.location) {
      queries.push(`artist grant "${context.location}" deadline`);
      queries.push(`art opportunity "${context.location}" local`);
    }

    // Add date-specific queries
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    queries.push(`artist grant deadline ${currentYear}`);
    queries.push(`art fellowship ${nextYear} application`);

    return queries.slice(0, 6); // Limit to avoid excessive API usage
  }

  /**
   * Execute Google Custom Search
   */
  private async executeGoogleSearch(query: string): Promise<GoogleSearchResult[]> {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = new URLSearchParams({
      key: this.searchConfig.googleApiKey,
      cx: this.searchConfig.googleCxId,
      q: query,
      num: this.searchConfig.maxResultsPerQuery.toString(),
      safe: 'active',
      dateRestrict: this.searchConfig.dateRestrict,
      fileType: '', // Exclude PDFs and docs for now
      siteSearch: '', // Can be used to limit to specific sites
      sort: 'date' // Prefer recent results
    });

    const response = await fetch(`${url}?${params}`, {
      signal: AbortSignal.timeout(this.searchConfig.timeout)
    });

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
    }

    const data: GoogleSearchResponse = await response.json();
    return data.items || [];
  }

  /**
   * Use Gemini to filter search results for relevance
   */
  private async geminiFilterResults(results: GoogleSearchResult[], query: string): Promise<GoogleSearchResult[]> {
    const filteredResults: GoogleSearchResult[] = [];

    // Process results in batches to avoid overwhelming Gemini
    const batchSize = 5;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      try {
        const analyses = await this.batchAnalyzeWithGemini(batch, query);
        
        // Filter based on Gemini analysis
        for (let j = 0; j < batch.length; j++) {
          const analysis = analyses[j];
          if (analysis && analysis.isOpportunity && analysis.relevanceScore > 0.6) {
            filteredResults.push(batch[j]);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn('Gemini filtering failed for batch, including all results:', error);
        filteredResults.push(...batch);
      }
    }

    return filteredResults;
  }

  /**
   * Batch analyze search results with Gemini
   */
  private async batchAnalyzeWithGemini(results: GoogleSearchResult[], query: string): Promise<(GeminiAnalysis | null)[]> {
    const prompt = this.buildAnalysisPrompt(results, query);
    
    try {
      const analysis = await this.callGeminiAPI(prompt);
      return this.parseGeminiBatchAnalysis(analysis, results.length);
    } catch (error) {
      console.error('Gemini batch analysis failed:', error);
      return results.map(() => null);
    }
  }

  /**
   * Build analysis prompt for Gemini
   */
  private buildAnalysisPrompt(results: GoogleSearchResult[], query: string): string {
    const resultsText = results.map((result, index) => 
      `${index + 1}. Title: ${result.title}\nSnippet: ${result.snippet}\nURL: ${result.link}`
    ).join('\n\n');

    return `You are an expert at identifying artist opportunities (grants, fellowships, residencies, competitions, exhibitions, jobs).

Original search query: "${query}"

Analyze each of the following search results and determine:
1. Is this actually an artist opportunity? (grants, fellowships, residencies, competitions, jobs, exhibitions, calls for art)
2. Relevance score (0.0-1.0) for visual artists specifically
3. Type of opportunity (grant, fellowship, residency, competition, job, exhibition, etc.)
4. Confidence in your assessment (0.0-1.0)

Search Results:
${resultsText}

Respond with a JSON array containing analysis for each result:
[
  {
    "isOpportunity": boolean,
    "relevanceScore": number,
    "opportunityType": "string",
    "confidence": number,
    "reasoning": "brief explanation"
  }
]

Be strict in your assessment - only mark as opportunities if they are clearly for artists and involve funding, jobs, exhibitions, or similar professional opportunities.`;
  }

  /**
   * Call Gemini API
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.searchConfig.geminiModel}:generateContent?key=${this.searchConfig.geminiApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent analysis
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Parse Gemini batch analysis response
   */
  private parseGeminiBatchAnalysis(response: string, expectedCount: number): (GeminiAnalysis | null)[] {
    try {
      // Extract JSON from response (Gemini sometimes adds extra text)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analyses = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(analyses)) {
        throw new Error('Response is not an array');
      }

      // Ensure we have the right number of analyses
      const results: (GeminiAnalysis | null)[] = [];
      for (let i = 0; i < expectedCount; i++) {
        if (i < analyses.length && analyses[i]) {
          results.push(analyses[i] as GeminiAnalysis);
        } else {
          results.push(null);
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to parse Gemini analysis:', error);
      return Array(expectedCount).fill(null);
    }
  }

  /**
   * Convert search result to opportunity with Gemini analysis
   */
  private async convertWithGeminiAnalysis(
    result: GoogleSearchResult,
    context?: DiscoveryContext
  ): Promise<OpportunityData | null> {
    try {
      console.log(`Processing with Gemini: ${result.title}`);

      // First, get enhanced analysis from Gemini
      const geminiAnalysis = await this.analyzeWithGemini(result);
      
      // Skip if Gemini doesn't think it's a good opportunity
      if (!geminiAnalysis || !geminiAnalysis.isOpportunity || geminiAnalysis.relevanceScore < 0.5) {
        console.log(`Skipping low-relevance result: ${result.title} (score: ${geminiAnalysis?.relevanceScore || 0})`);
        return null;
      }

      // Try to fetch detailed content
      let detailedData: Partial<OpportunityData> | null = null;
      try {
        detailedData = await this.fetchDetailedContent(result.link);
      } catch (error) {
        console.warn(`Failed to fetch detailed content for ${result.link}:`, error);
      }

      // Build opportunity data from multiple sources
      const opportunity: OpportunityData = {
        title: geminiAnalysis.extractedInfo.title || detailedData?.title || result.title,
        description: geminiAnalysis.extractedInfo.description || detailedData?.description || result.snippet,
        organization: geminiAnalysis.extractedInfo.organization || detailedData?.organization || result.displayLink,
        url: result.link,
        deadline: this.parseDate(geminiAnalysis.extractedInfo.deadline) || detailedData?.deadline,
        amount: geminiAnalysis.extractedInfo.amount || detailedData?.amount,
        location: geminiAnalysis.extractedInfo.location || detailedData?.location,
        tags: [
          ...(geminiAnalysis.extractedInfo.tags || []),
          ...(detailedData?.tags || []),
          geminiAnalysis.opportunityType
        ].filter(Boolean),
        sourceType: 'websearch',
        sourceMetadata: {
          searchEngine: 'google',
          aiAnalysis: 'gemini',
          relevanceScore: geminiAnalysis.relevanceScore,
          opportunityType: geminiAnalysis.opportunityType,
          confidence: geminiAnalysis.confidence,
          reasoning: geminiAnalysis.reasoning,
          discoveredAt: new Date().toISOString()
        }
      };

      // Clean the data
      const cleaningResult = await this.dataCleaner.clean(opportunity);
      
      if (!cleaningResult.success || !cleaningResult.data) {
        console.warn('Data cleaning failed for opportunity');
        return null;
      }

      return cleaningResult.data;

    } catch (error) {
      console.error('Error converting search result with Gemini analysis:', error);
      return null;
    }
  }

  /**
   * Analyze a single result with Gemini
   */
  private async analyzeWithGemini(result: GoogleSearchResult): Promise<GeminiAnalysis | null> {
    const prompt = `You are an expert at analyzing artist opportunities. 

Analyze this search result and extract detailed information:

Title: ${result.title}
Snippet: ${result.snippet}
URL: ${result.link}
Domain: ${result.displayLink}

Determine:
1. Is this an artist opportunity (grant, fellowship, residency, job, exhibition, competition)?
2. Relevance score (0.0-1.0) for visual artists
3. Extract specific details if available: title, organization, deadline, amount, location, description
4. Opportunity type and confidence

Respond with JSON:
{
  "isOpportunity": boolean,
  "relevanceScore": number,
  "opportunityType": "string",
  "extractedInfo": {
    "title": "string or null",
    "organization": "string or null", 
    "deadline": "string or null",
    "amount": "string or null",
    "location": "string or null",
    "description": "string or null",
    "tags": ["array", "of", "strings"]
  },
  "reasoning": "brief explanation",
  "confidence": number
}`;

    try {
      const response = await this.callGeminiAPI(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return null;
      }

      return JSON.parse(jsonMatch[0]) as GeminiAnalysis;
      
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      return null;
    }
  }

  /**
   * Fetch detailed content from URL
   */
  private async fetchDetailedContent(url: string): Promise<Partial<OpportunityData> | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      const rawData: RawData = {
        content: html,
        contentType: 'html' as const,
        url: url
      };

      const extractionResult = await this.dataExtractor.extract(rawData, 'websearch');
      
      if (extractionResult.success && extractionResult.data) {
        return extractionResult.data;
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Parse date string
   */
  private parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Deduplicate results
   */
  private deduplicateResults(results: GoogleSearchResult[]): GoogleSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const normalizedUrl = result.link.toLowerCase().split('?')[0]; // Remove query params
      if (seen.has(normalizedUrl)) {
        return false;
      }
      seen.add(normalizedUrl);
      return true;
    });
  }

  protected getDefaultConfig() {
    return {
      ...super.getDefaultConfig(),
      rateLimit: 50, // Conservative rate limit for Google API
      timeout: 25000, // 25 seconds for AI processing
      retryAttempts: 2
    };
  }
}