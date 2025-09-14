import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../search/search.service';
import { AnalysisService } from '../analysis/analysis.service';

export interface ResearchSession {
  sessionId: string;
  serviceId: string;
  profileId: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  progress?: number;
  startedAt: string;
  updatedAt: string;
  resultsCount?: number;
  error?: string;
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);
  private sessions: Map<string, ResearchSession> = new Map();

  constructor(
    private readonly searchService: SearchService,
    private readonly analysisService: AnalysisService,
  ) {}

  async getActiveSessions(profileId: string): Promise<ResearchSession[]> {
    // For now, return empty array as there are no active sessions
    // In the future, this will query the database for actual sessions
    this.logger.log(`Getting active sessions for profile: ${profileId}`);
    
    const activeSessions = Array.from(this.sessions.values()).filter(
      session => session.profileId === profileId && session.status !== 'completed'
    );

    this.logger.log(`Found ${activeSessions.length} active sessions for profile ${profileId}:`, activeSessions);
    return activeSessions;
  }

  async startService(serviceId: string, profileId: string, options: any): Promise<{ sessionId: string }> {
    const sessionId = `session_${serviceId}_${profileId}_${Date.now()}`;
    
    const session: ResearchSession = {
      sessionId,
      serviceId,
      profileId,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resultsCount: 0,
    };

    this.sessions.set(sessionId, session);
    
    this.logger.log(`Started research service: ${serviceId} for profile: ${profileId} with session: ${sessionId}`);
    
    // Simulate service completion after 5 seconds
    setTimeout(() => {
      const currentSession = this.sessions.get(sessionId);
      if (currentSession && currentSession.status === 'running') {
        currentSession.status = 'completed';
        currentSession.progress = 100;
        currentSession.resultsCount = Math.floor(Math.random() * 20) + 5; // Random results count
        currentSession.updatedAt = new Date().toISOString();
        this.sessions.set(sessionId, currentSession);
      }
    }, 5000);

    return { sessionId };
  }

  async stopService(serviceId: string, sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && session.serviceId === serviceId) {
      session.status = 'stopped';
      session.updatedAt = new Date().toISOString();
      this.sessions.set(sessionId, session);
      this.logger.log(`Stopped research service: ${serviceId} with session: ${sessionId}`);
    } else {
      throw new Error(`Session ${sessionId} not found or does not belong to service ${serviceId}`);
    }
  }

  async getServiceStatus(serviceId: string, sessionId: string): Promise<{
    status: string;
    progress?: number;
    updatedAt: string;
    error?: string;
    resultsCount?: number;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session || session.serviceId !== serviceId) {
      throw new Error(`Session ${sessionId} not found or does not belong to service ${serviceId}`);
    }

    return {
      status: session.status,
      progress: session.progress,
      updatedAt: session.updatedAt,
      error: session.error,
      resultsCount: session.resultsCount,
    };
  }

  async getServiceResults(
    serviceId: string, 
    sessionId: string, 
    options: { limit: number; offset: number }
  ): Promise<{
    results: any[];
    total: number;
    hasMore: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session || session.serviceId !== serviceId) {
      throw new Error(`Session ${sessionId} not found or does not belong to service ${serviceId}`);
    }

    // Generate mock results based on service type
    const mockResults = this.generateMockResults(serviceId, session.resultsCount || 0);
    
    const startIndex = options.offset;
    const endIndex = Math.min(startIndex + options.limit, mockResults.length);
    const paginatedResults = mockResults.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      total: mockResults.length,
      hasMore: endIndex < mockResults.length,
    };
  }

  async exportResults(
    profileId: string, 
    serviceIds?: string[], 
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    // Get all sessions for the profile
    const profileSessions = Array.from(this.sessions.values()).filter(
      session => session.profileId === profileId
    );

    const filteredSessions = serviceIds 
      ? profileSessions.filter(session => serviceIds.includes(session.serviceId))
      : profileSessions;

    const allResults = [];
    for (const session of filteredSessions) {
      const sessionResults = await this.getServiceResults(
        session.serviceId, 
        session.sessionId, 
        { limit: 1000, offset: 0 }
      );
      
      allResults.push({
        serviceId: session.serviceId,
        sessionId: session.sessionId,
        results: sessionResults.results,
        total: sessionResults.total,
      });
    }

    if (format === 'csv') {
      return this.convertToCSV(allResults);
    }

    return {
      profileId,
      exportedAt: new Date().toISOString(),
      services: allResults,
    };
  }

  private generateMockResults(serviceId: string, count: number): any[] {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      let mockResult;
      
      switch (serviceId) {
        case 'web-search':
          mockResult = {
            id: `web-${i}`,
            title: `Art Opportunity ${i + 1}`,
            description: `Mock art opportunity discovered through web search for ${serviceId}`,
            url: `https://example.com/opportunity-${i}`,
            deadline: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
            relevanceScore: Math.random(),
            source: 'web-search',
          };
          break;
          
        case 'social-media':
          mockResult = {
            id: `social-${i}`,
            title: `Social Media Post ${i + 1}`,
            description: `Art opportunity shared on social media platform`,
            url: `https://instagram.com/p/mock-${i}`,
            platform: 'instagram',
            relevanceScore: Math.random(),
            source: 'social-media',
          };
          break;
          
        default:
          mockResult = {
            id: `${serviceId}-${i}`,
            title: `${serviceId} Result ${i + 1}`,
            description: `Mock result from ${serviceId} service`,
            url: `https://example.com/${serviceId}-result-${i}`,
            relevanceScore: Math.random(),
            source: serviceId,
          };
      }
      
      results.push(mockResult);
    }
    
    return results;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const flatResults = data.flatMap(service => 
      service.results.map((result: any) => ({
        serviceId: service.serviceId,
        sessionId: service.sessionId,
        ...result,
      }))
    );
    
    if (flatResults.length === 0) return '';
    
    const headers = Object.keys(flatResults[0]);
    const csvContent = [
      headers.join(','),
      ...flatResults.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  async fetchNewOpportunities(options: {
    searchTerms: string;
    types: string[];
    minRelevanceScore: number;
    profileId: string;
  }): Promise<{
    opportunities: any[];
    totalFound: number;
    newOpportunities: number;
    duplicates: number;
    duplicateUrls: string[];
    message: string;
  }> {
    try {
      this.logger.log(`Fetching new opportunities with search terms: "${options.searchTerms}"`);
      
      // Use the search service to find opportunities
      let searchResponse = await this.searchService.searchArtOpportunities(options.searchTerms, {
        num: 20, // Fetch 20 results
      });

      // If no results with specific terms, try fallback strategies
      if (!searchResponse.results || searchResponse.results.length === 0) {
        this.logger.log(`No results for "${options.searchTerms}", trying fallback strategies...`);
        
        // Try broader terms
        const fallbackQueries = [
          'art opportunities grants',
          'art residencies',  
          'artist grants',
          'art opportunities'
        ];
        
        for (const fallbackQuery of fallbackQueries) {
          this.logger.log(`Trying fallback query: "${fallbackQuery}"`);
          searchResponse = await this.searchService.searchArtOpportunities(fallbackQuery, {
            num: 20,
          });
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            this.logger.log(`Found ${searchResponse.results.length} results with fallback query: "${fallbackQuery}"`);
            break;
          }
        }
        
        // If still no results, return appropriate message
        if (!searchResponse.results || searchResponse.results.length === 0) {
          this.logger.log('No search results found even with fallback queries');
          return {
            opportunities: [],
            totalFound: 0,
            newOpportunities: 0,
            duplicates: 0,
            duplicateUrls: [],
            message: 'No search results found. The search index may need to be configured or updated.'
          };
        }
      }

      this.logger.log(`Found ${searchResponse.results.length} search results, scraping and analyzing...`);

      // Use the analysis service to scrape and analyze the search results
      const analysisResponse = await this.analysisService.scrapeAndAnalyze(
        searchResponse.results,
        options.searchTerms,
        options.profileId
      );

      if (!analysisResponse.success || !analysisResponse.data) {
        this.logger.error('Analysis service failed', analysisResponse.error);
        return {
          opportunities: [],
          totalFound: searchResponse.results.length,
          newOpportunities: 0,
          duplicates: 0,
          duplicateUrls: [],
          message: `Analysis failed: ${analysisResponse.error}`
        };
      }

      // Extract save results for better user feedback
      const saveResults = analysisResponse.data.saveResults;

      // Get the newly saved opportunities from the database
      const savedOpportunities = await this.analysisService.getOpportunities({
        page: 1,
        limit: saveResults.saved,
        search: options.searchTerms
      });

      let message = '';
      if (saveResults.saved > 0 && saveResults.duplicates === 0) {
        message = `Found ${saveResults.saved} new opportunities and added them to your database.`;
      } else if (saveResults.saved > 0 && saveResults.duplicates > 0) {
        message = `Found ${saveResults.saved} new opportunities (${saveResults.duplicates} were already in your database).`;
      } else if (saveResults.saved === 0 && saveResults.duplicates > 0) {
        message = `Found ${saveResults.duplicates} opportunities, but all were already in your database. Check your existing opportunities list.`;
      } else {
        message = 'No new opportunities were found or saved.';
      }

      this.logger.log(`Processed results: ${saveResults.saved} saved, ${saveResults.duplicates} duplicates, ${saveResults.failed} failed`);

      return {
        opportunities: savedOpportunities.opportunities || [],
        totalFound: searchResponse.results.length,
        newOpportunities: saveResults.saved,
        duplicates: saveResults.duplicates,
        duplicateUrls: saveResults.duplicateUrls,
        message
      };
      
    } catch (error) {
      this.logger.error('Failed to fetch new opportunities', error);
      throw new Error(`Failed to fetch new opportunities: ${error.message}`);
    }
  }

  private determineOpportunityType(type: string): 'grant' | 'residency' | 'exhibition' | 'competition' | 'fellowship' | 'other' {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('grant') || typeLower.includes('funding') || typeLower.includes('award')) return 'grant';
    if (typeLower.includes('residency') || typeLower.includes('residence')) return 'residency';
    if (typeLower.includes('exhibition') || typeLower.includes('show') || typeLower.includes('gallery')) return 'exhibition';
    if (typeLower.includes('competition') || typeLower.includes('contest')) return 'competition';
    if (typeLower.includes('fellowship') || typeLower.includes('program')) return 'fellowship';
    
    return 'other';
  }
}
