import axios, { AxiosError } from 'axios';
import { ArtistProfile, CreateProfileRequest, UpdateProfileRequest } from '@/types/profile';
import { AnalysisResult, AnalysisStats, OpportunityScore, Opportunity } from '@/types/analyst';
import { handleApiError, isAuthError } from './error-handler';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add any request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle authentication errors globally
    if (isAuthError(error)) {
      // Redirect to login if not authenticated
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    // Process and enhance error
    const apiError = handleApiError(error, false); // Don't show toast here, let the component decide
    return Promise.reject(apiError);
  }
);

export const profileApi = {
  // Get all artist profiles for user
  getProfiles: async (): Promise<ArtistProfile[]> => {
    const response = await api.get('/api/profiles');
    return response.data.data; // Backend returns { success: true, data: [...] }
  },

  // Get specific artist profile
  getProfile: async (id: string): Promise<ArtistProfile> => {
    const response = await api.get(`/api/profiles/${id}`);
    return response.data.data; // Backend returns { success: true, data: {...} }
  },

  // Create new artist profile
  createProfile: async (profile: CreateProfileRequest): Promise<ArtistProfile> => {
    const response = await api.post('/api/profiles', profile);
    return response.data.data; // Backend returns { success: true, data: {...} }
  },

  // Update specific artist profile
  updateProfile: async (id: string, updates: UpdateProfileRequest): Promise<ArtistProfile> => {
    try {
      const response = await api.put(`/api/profiles/${id}`, updates);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error: any) {
      console.error('API Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // Delete artist profile
  deleteProfile: async (id: string): Promise<void> => {
    await api.delete(`/api/profiles/${id}`);
  },

  // Enhance system prompt for profile
  enhancePrompt: async (id: string): Promise<{ originalPrompt: string; enhancedPrompt: string }> => {
    const response = await api.post(`/api/profiles/${id}/enhance-prompt`);
    return response.data.data; // Backend returns { success: true, data: { originalPrompt, enhancedPrompt } }
  },
};

// User preferences API
export const userApi = {
  // Get current user info
  getMe: async () => {
    const response = await api.get('/api/users/me');
    return response.data.data;
  },

  // Get user preferences
  getPreferences: async () => {
    const response = await api.get('/api/users/me/preferences');
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (preferences: any) => {
    const response = await api.put('/api/users/me/preferences', { preferences });
    return response.data.data;
  },
};

// Analyst API
export const analystApi = {
  // Run complete analysis for a profile
  analyze: async (profileId: string): Promise<AnalysisResult> => {
    const response = await api.post('/api/analyst/analyze', { artistProfileId: profileId });
    return response.data.data;
  },

  // Generate search queries for a profile
  generateQueries: async (profileId: string, options?: { maxQueries?: number; sourceTypes?: string[] }): Promise<{ queries: string[] }> => {
    const response = await api.post('/api/analyst/generate-queries', { 
      artistProfileId: profileId,
      ...options
    });
    return response.data.data;
  },

  // Score opportunities for relevance
  scoreOpportunities: async (profileId: string, opportunityIds: string[]): Promise<{ scores: OpportunityScore[] }> => {
    const response = await api.post('/api/analyst/score-opportunities', { 
      artistProfileId: profileId,
      opportunityIds
    });
    return response.data.data;
  },

  // Get analysis statistics for a profile
  getStats: async (profileId: string): Promise<AnalysisStats> => {
    const response = await api.get(`/api/analyst/stats/${profileId}`);
    return response.data.data;
  },

  // Health check for analyst service
  checkHealth: async (): Promise<{ status: string }> => {
    const response = await api.get('/api/analyst/health');
    return response.data.data;
  },
};

// Research Service API for the research dashboard
export const researchApi = {
  // Start a specific research service
  startService: async (serviceId: string, profileId: string, options?: any) => {
    const response = await api.post('/api/research/start', {
      serviceId,
      profileId,
      options
    });
    return response.data.data;
  },

  // Stop a specific research service
  stopService: async (serviceId: string, sessionId: string) => {
    const response = await api.post('/api/research/stop', {
      serviceId,
      sessionId
    });
    return response.data.data;
  },

  // Get status of a research service
  getServiceStatus: async (serviceId: string, sessionId: string) => {
    const response = await api.get(`/api/research/status/${serviceId}/${sessionId}`);
    return response.data.data;
  },

  // Get results from a research service
  getServiceResults: async (serviceId: string, sessionId: string, options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const response = await api.get(`/api/research/results/${serviceId}/${sessionId}?${params}`);
    return response.data.data;
  },

  // Get all active research sessions for a profile
  getActiveSessions: async (profileId: string) => {
    const response = await api.get(`/api/research/sessions/${profileId}`);
    return response.data.data;
  },

  // Export research results
  exportResults: async (profileId: string, serviceIds?: string[], format: 'json' | 'csv' = 'json') => {
    const response = await api.post('/api/research/export', {
      profileId,
      serviceIds,
      format
    }, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });
    
    if (format === 'csv') {
      return response.data; // Return blob for download
    }
    return response.data.data;
  }
};

// Opportunity API - connects to archivist service
export const opportunityApi = {
  // Get opportunities with filtering and pagination
  getOpportunities: async (options?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    minRelevanceScore?: number;
    deadlineBefore?: string;
  }): Promise<{
    data: Opportunity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.type) params.append('type', options.type);
    if (options?.minRelevanceScore) params.append('minRelevanceScore', options.minRelevanceScore.toString());
    if (options?.deadlineBefore) params.append('deadlineBefore', options.deadlineBefore);

    const response = await api.get(`/api/analysis/opportunities?${params}`);
    // Transform the response to match expected format
    const result = response.data;
    const pagination = result.pagination || { offset: 0, limit: 10, total: 0 };
    
    return {
      data: result.data || [],
      pagination: {
        page: Math.floor(pagination.offset / pagination.limit) + 1,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      }
    };
  },

  // Get specific opportunity by ID
  getOpportunity: async (id: string): Promise<Opportunity> => {
    const response = await api.get(`/api/analysis/opportunities/${id}`);
    return response.data.data;
  },

  // Get high relevance opportunities
  getHighRelevanceOpportunities: async (threshold: number = 0.7): Promise<Opportunity[]> => {
    const response = await api.get(`/api/archivist/opportunities/high-relevance?threshold=${threshold}`);
    return response.data.data;
  },

  // Get opportunities with upcoming deadlines
  getUpcomingDeadlines: async (days: number = 7): Promise<Opportunity[]> => {
    const response = await api.get(`/api/archivist/opportunities/upcoming-deadlines?days=${days}`);
    return response.data.data;
  },


  // Get opportunities with stats
  getOpportunitiesWithStats: async (): Promise<Opportunity[]> => {
    const response = await api.get('/api/archivist/opportunities/with-stats');
    return response.data.data;
  },

  // Create new opportunity
  createOpportunity: async (opportunity: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Opportunity> => {
    const response = await api.post('/api/archivist/opportunities', opportunity);
    return response.data.data;
  },

  // Update opportunity
  updateOpportunity: async (id: string, updates: Partial<Opportunity>): Promise<Opportunity> => {
    const response = await api.put(`/api/archivist/opportunities/${id}`, updates);
    return response.data.data;
  },

  // Delete opportunity
  deleteOpportunity: async (id: string): Promise<void> => {
    await api.delete(`/api/archivist/opportunities/${id}`);
  },

  // Bulk create opportunities
  bulkCreateOpportunities: async (opportunities: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{
    created: number;
    duplicates: number;
    errors: any[];
  }> => {
    const response = await api.post('/api/archivist/opportunities/bulk', { opportunities });
    return response.data.data;
  }
};

// Search API
export const searchApi = {
  // Google Search
  googleSearch: async (query: string, options: {
    num?: number;
    location?: string;
    hl?: string;
    gl?: string;
    start?: number;
  } = {}): Promise<{
    results: Array<{
      title: string;
      link: string;
      snippet: string;
      position: number;
      domain?: string;
      date?: string;
    }>;
    totalResults: number;
    searchTime: number;
    query: string;
  }> => {
    try {
      const response = await api.post('/api/search/google', { query, ...options });
      return response.data.data;
    } catch (error: any) {
      // Re-throw with additional context for search-specific errors
      if (error.response?.data?.code === 'SEARCH_QUOTA_EXCEEDED') {
        const enhancedError = new Error('Search quota exceeded. Please try again later.');
        (enhancedError as any).code = 'SEARCH_QUOTA_EXCEEDED';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      if (error.response?.data?.code === 'SEARCH_CREDENTIALS_ERROR') {
        const enhancedError = new Error('Search service is temporarily unavailable.');
        (enhancedError as any).code = 'SEARCH_CREDENTIALS_ERROR';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      throw error;
    }
  },

  // Yandex Search
  yandexSearch: async (query: string, options: {
    num?: number;
    location?: string;
    hl?: string;
    start?: number;
  } = {}): Promise<{
    results: Array<{
      title: string;
      link: string;
      snippet: string;
      position: number;
      domain?: string;
      date?: string;
    }>;
    totalResults: number;
    searchTime: number;
    query: string;
  }> => {
    const response = await api.post('/api/search/yandex', { query, ...options });
    return response.data.data;
  },

  // Bing Search
  bingSearch: async (query: string, options: {
    num?: number;
    location?: string;
    hl?: string;
    start?: number;
  } = {}): Promise<{
    results: Array<{
      title: string;
      link: string;
      snippet: string;
      position: number;
      domain?: string;
      date?: string;
    }>;
    totalResults: number;
    searchTime: number;
    query: string;
  }> => {
    const response = await api.post('/api/search/bing', { query, ...options });
    return response.data.data;
  },

  // Search multiple queries
  searchMultipleQueries: async (queries: string[], options: {
    num?: number;
    location?: string;
    hl?: string;
    gl?: string;
    artFocus?: boolean;
  } = {}): Promise<{
    results: Array<any>;
    totalQueries: number;
    successfulQueries: number;
  }> => {
    try {
      const response = await api.post('/api/search/google/multiple', { queries, ...options });
      return response.data.data;
    } catch (error: any) {
      // For multiple queries, quota errors might be mixed in the results
      // Check if the error is a global quota issue
      if (error.response?.data?.code === 'SEARCH_QUOTA_EXCEEDED') {
        const enhancedError = new Error('Search quota exceeded. Please try again later.');
        (enhancedError as any).code = 'SEARCH_QUOTA_EXCEEDED';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      if (error.response?.data?.code === 'SEARCH_CREDENTIALS_ERROR') {
        const enhancedError = new Error('Search service is temporarily unavailable.');
        (enhancedError as any).code = 'SEARCH_CREDENTIALS_ERROR';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      throw error;
    }
  },

  // Search for art opportunities
  searchArtOpportunities: async (query: string, options: {
    num?: number;
  } = {}): Promise<{
    results: Array<{
      title: string;
      link: string;
      snippet: string;
      position: number;
      domain?: string;
      date?: string;
    }>;
    totalResults: number;
    searchTime: number;
    query: string;
  }> => {
    try {
      const response = await api.post('/api/search/art-opportunities', { query, ...options });
      return response.data.data;
    } catch (error: any) {
      // Re-throw with additional context for search-specific errors
      if (error.response?.data?.code === 'SEARCH_QUOTA_EXCEEDED') {
        const enhancedError = new Error('Search quota exceeded. Please try again later.');
        (enhancedError as any).code = 'SEARCH_QUOTA_EXCEEDED';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      if (error.response?.data?.code === 'SEARCH_CREDENTIALS_ERROR') {
        const enhancedError = new Error('Search service is temporarily unavailable.');
        (enhancedError as any).code = 'SEARCH_CREDENTIALS_ERROR';
        (enhancedError as any).originalError = error;
        throw enhancedError;
      }
      throw error;
    }
  },

  // Process search results through external data pipeline
  processSearchResults: async (searchResults: any[], options: {
    enableScraping?: boolean;
    enableValidation?: boolean;
    enableDeduplication?: boolean;
    organizationScraping?: boolean;
    profileId?: string;
    pipeline?: {
      qualityThreshold?: number;
      maxConcurrent?: number;
      enableMetadataEnrichment?: boolean;
    };
  } = {}): Promise<{
    success: boolean;
    data?: {
      jobId: string;
      processed: number;
      opportunities: any[];
      statistics: {
        total: number;
        valid: number;
        duplicates: number;
        averageScore: number;
      };
    };
  }> => {
    const response = await api.post('/api/research/process-search-results', { 
      searchResults, 
      options 
    });
    return response.data;
  },


  // Health check
  healthCheck: async (): Promise<{
    googleSearch: boolean;
    timestamp: string;
  }> => {
    const response = await api.get('/api/search/health');
    return response.data.data;
  }
};

// Query Bucket API
export const queryBucketApi = {
  // Get all queries in user's bucket
  getQueries: async (): Promise<{
    id: string;
    query: string;
    source: string;
    tags: string[];
    profileId?: string;
    createdAt: string;
    updatedAt: string;
  }[]> => {
    const response = await api.get('/api/query-bucket');
    return response.data.queries;
  },

  // Add query to bucket
  addQuery: async (query: string, options: {
    profileId?: string;
    source?: 'manual' | 'generated' | 'ai';
    tags?: string[];
  } = {}): Promise<{
    id: string;
    query: string;
    source: string;
    tags: string[];
    profileId?: string;
    createdAt: string;
    updatedAt: string;
  }> => {
    const response = await api.post('/api/query-bucket', { query, ...options });
    return response.data.query;
  },

  // Remove query from bucket
  removeQuery: async (query: string): Promise<void> => {
    await api.delete('/api/query-bucket', { data: { query } });
  },

  // Clear all queries from bucket
  clearBucket: async (): Promise<void> => {
    await api.delete('/api/query-bucket/clear');
  },

  // Update query tags
  updateQuery: async (id: string, tags: string[]): Promise<void> => {
    await api.put(`/api/query-bucket/${id}`, { tags });
  }
};

// Web Scraper API
export const scraperApi = {
  // Scrape a single URL
  scrapeUrl: async (url: string, metadata?: {
    query?: string;
    searchEngine?: string;
    position?: number;
  }): Promise<{
    success: boolean;
    data?: any;
    meta?: {
      processingTime: number;
      method: string;
      scrapedAt: string;
    };
    error?: string;
  }> => {
    const response = await api.post('/api/scraper/scrape', { url, metadata });
    return response.data;
  },

  // Scrape multiple URLs
  scrapeMultiple: async (urls: string[], metadata?: {
    query?: string;
    searchEngine?: string;
  }): Promise<{
    success: boolean;
    data?: {
      results: any[];
      summary: {
        total: number;
        successful: number;
        failed: number;
        successRate: number;
      };
    };
    meta?: {
      totalProcessingTime: number;
      processedAt: string;
    };
  }> => {
    const response = await api.post('/api/scraper/scrape-multiple', { urls, metadata });
    return response.data;
  },

  // Scrape search results
  scrapeSearchResults: async (searchResults: any[], query: string): Promise<{
    success: boolean;
    data?: {
      opportunities: any[];
      results: any[];
      summary: {
        query: string;
        totalUrls: number;
        successful: number;
        failed: number;
        successRate: number;
        avgProcessingTime: number;
      };
    };
    meta?: {
      processedAt: string;
      totalProcessingTime: number;
    };
  }> => {
    const response = await api.post('/api/scraper/scrape-search-results', { searchResults, query });
    return response.data;
  },

  // Check scraper health
  healthCheck: async (): Promise<{
    success: boolean;
    data?: {
      firecrawl: boolean;
      playwright: boolean;
      cheerio: boolean;
      status: string;
    };
    meta?: {
      timestamp: string;
      preferredMethod: string;
    };
  }> => {
    const response = await api.get('/api/scraper/health');
    return response.data;
  }
};

// AI Analysis API
export const analysisApi = {
  // Analyze single opportunity
  analyzeOpportunity: async (opportunity: any, profileId: string): Promise<{
    success: boolean;
    data?: {
      analysis: any;
      opportunity: any;
      profile: any;
    };
    meta?: {
      processingTime: number;
      aiService: string;
      analyzedAt: string;
    };
  }> => {
    const response = await api.post('/api/analysis/analyze-opportunity', { opportunity, profileId });
    return response.data;
  },

  // Analyze batch of opportunities
  analyzeBatch: async (opportunities: any[], profileId: string): Promise<{
    success: boolean;
    data?: {
      analyses: any[];
      summary: {
        total: number;
        successful: number;
        failed: number;
        averageScore: number;
        recommendations: {
          high: number;
          medium: number;
          low: number;
          notRelevant: number;
        };
      };
      profile: any;
    };
    meta?: {
      totalProcessingTime: number;
      avgProcessingTime: number;
      analyzedAt: string;
      aiService: string;
    };
  }> => {
    const response = await api.post('/api/analysis/analyze-batch', { opportunities, profileId });
    return response.data;
  },

  // Combined scrape and analyze
  scrapeAndAnalyze: async (searchResults: any[], query: string, profileId: string): Promise<{
    success: boolean;
    data?: {
      query: string;
      scrapeResults: {
        total: number;
        successful: number;
        failed: number;
      };
      analysisResults: any[];
      relevantOpportunities: any[];
      highValueOpportunities: any[];
      summary: {
        searchResultsProcessed: number;
        successfullyScrapped: number;
        analyzed: number;
        relevant: number;
        highValue: number;
        conversionRate: number;
      };
    };
    meta?: {
      processedAt: string;
      totalProcessingTime: number;
    };
  }> => {
    const response = await api.post('/api/analysis/scrape-and-analyze', { 
      searchResults, 
      query, 
      profileId 
    });
    return response.data;
  },

  // Check analysis service health
  healthCheck: async (): Promise<{
    success: boolean;
    data?: {
      openai: boolean;
      ruleBasedFallback: boolean;
      status: string;
    };
    meta?: {
      timestamp: string;
      preferredMethod: string;
    };
  }> => {
    const response = await api.get('/api/analysis/health');
    return response.data;
  }
};

// Deduplication API
export const deduplicationApi = {
  // Detect duplicates in opportunities
  detectDuplicates: async (opportunities: any[], analysisResults?: any[], options?: {
    titleSimilarityThreshold?: number;
    descriptionSimilarityThreshold?: number;
    organizationMatchRequired?: boolean;
    deadlineToleranceDays?: number;
    urlDomainMatching?: boolean;
  }): Promise<{
    success: boolean;
    data?: {
      deduplication: {
        originalCount: number;
        uniqueCount: number;
        duplicateGroups: Array<{
          id: string;
          opportunities: any[];
          primaryOpportunity: any;
          duplicateCount: number;
          confidence: number;
          reason: string;
          mergedAt: string;
        }>;
        removedDuplicates: any[];
        uniqueOpportunities: any[];
        processingTime: number;
        duplicateDetectionRate: number;
      };
      statistics: {
        originalCount: number;
        uniqueCount: number;
        duplicatesRemoved: number;
        duplicateGroups: number;
        duplicateRate: number;
        confidenceLevels: {
          high: number;
          medium: number;
          low: number;
        };
        averageGroupSize: number;
      };
    };
    meta?: {
      processingTime: number;
      processedAt: string;
      userId: string;
      deduplicationMethod: string;
    };
  }> => {
    const response = await api.post('/api/deduplication/detect-duplicates', { 
      opportunities, 
      analysisResults, 
      options 
    });
    return response.data;
  },

  // Full pipeline processing: scrape, analyze, and deduplicate
  processPipeline: async (searchResults: any[], query: string, profileId: string, options?: {
    deduplication?: {
      titleSimilarityThreshold?: number;
      descriptionSimilarityThreshold?: number;
      organizationMatchRequired?: boolean;
      deadlineToleranceDays?: number;
      urlDomainMatching?: boolean;
    };
  }): Promise<{
    success: boolean;
    data?: {
      query: string;
      scrapeResults: {
        total: number;
        successful: number;
        failed: number;
      };
      analysisResults: any[];
      deduplicationResult: {
        originalCount: number;
        uniqueCount: number;
        duplicateGroups: any[];
        removedDuplicates: any[];
        uniqueOpportunities: any[];
        processingTime: number;
        duplicateDetectionRate: number;
      };
      relevantOpportunities: any[];
      highValueOpportunities: any[];
      finalStats: {
        searchResultsProcessed: number;
        successfullyScrapped: number;
        analyzed: number;
        originalOpportunities: number;
        duplicatesRemoved: number;
        uniqueOpportunities: number;
        relevantOpportunities: number;
        highValueOpportunities: number;
        finalConversionRate: number;
      };
    };
    meta?: {
      processedAt: string;
      totalProcessingTime: number;
      pipelineSteps: string[];
    };
  }> => {
    const response = await api.post('/api/deduplication/process-pipeline', { 
      searchResults, 
      query, 
      profileId, 
      options 
    });
    return response.data;
  },

  // Check deduplication service health
  healthCheck: async (): Promise<{
    success: boolean;
    data?: {
      deduplicationAlgorithm: string;
      supportedMethods: string[];
      status: string;
    };
    meta?: {
      timestamp: string;
      version: string;
    };
  }> => {
    const response = await api.get('/api/deduplication/health');
    return response.data;
  }
};

// Liaison API - UI integration, export, and feedback
export const liaisonApi = {
  // Get opportunities with liaison-specific features
  getOpportunities: async (options?: {
    status?: string[];
    type?: string[];
    organization?: string;
    relevanceMinScore?: number;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Opportunity[];
    meta: {
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    };
  }> => {
    const params = new URLSearchParams();
    
    if (options?.status) options.status.forEach(s => params.append('status', s));
    if (options?.type) options.type.forEach(t => params.append('type', t));
    if (options?.organization) params.append('organization', options.organization);
    if (options?.relevanceMinScore) params.append('relevanceMinScore', options.relevanceMinScore.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get(`/api/liaison/opportunities?${params}`);
    return response.data;
  },

  // Update opportunity status
  updateOpportunityStatus: async (id: string, status: string): Promise<{
    success: boolean;
    data: Opportunity;
    message: string;
  }> => {
    const response = await api.post(`/api/liaison/opportunities/${id}/status`, { status });
    return response.data;
  },

  // Capture user feedback
  captureFeedback: async (feedback: {
    opportunityId: string;
    action: 'accepted' | 'rejected' | 'saved' | 'applied';
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.post('/api/liaison/feedback', feedback);
    return response.data;
  },

  // Export opportunities
  exportOpportunities: async (
    filters: {
      status?: string[];
      type?: string[];
      organization?: string[];
      relevanceMinScore?: number;
      deadlineAfter?: string;
      deadlineBefore?: string;
    },
    options: {
      format: 'csv' | 'json';
      filename?: string;
      includeMetadata?: boolean;
    }
  ): Promise<Blob> => {
    const response = await api.post('/api/liaison/export', 
      { filters, options },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Get export template
  getExportTemplate: async (format: 'csv' | 'json'): Promise<Blob> => {
    const response = await api.get(`/api/liaison/export/template/${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get dashboard data
  getDashboardData: async (): Promise<{
    success: boolean;
    data: {
      stats: {
        totalOpportunities: number;
        newThisWeek: number;
        upcomingDeadlines: number;
        highRelevance: number;
        inProgress: number;
        submitted: number;
      };
      recentOpportunities: Opportunity[];
      upcomingDeadlines: Opportunity[];
    };
  }> => {
    const response = await api.get('/api/liaison/dashboard');
    return response.data;
  },

  // Get liaison statistics
  getStats: async (): Promise<{
    success: boolean;
    data: {
      totalExports: number;
      feedbackCount: number;
      lastExport?: Date;
    };
  }> => {
    const response = await api.get('/api/liaison/stats');
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{
    success: boolean;
    data: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      details: {
        database: boolean;
        websocket: boolean;
        export: boolean;
      };
    };
  }> => {
    const response = await api.get('/api/liaison/health');
    return response.data;
  }
};

// Query Templates API
export const queryTemplatesApi = {
  // Get all template groups with templates
  getGroups: async () => {
    const response = await api.get('/api/query-templates/groups');
    return response.data;
  },

  // Get single template
  getTemplate: async (id: string) => {
    const response = await api.get(`/api/query-templates/${id}`);
    return response.data;
  },

  // Create new template
  createTemplate: async (data: {
    groupId: string;
    template: string;
    placeholders: string[];
    order?: number;
  }) => {
    const response = await api.post('/api/query-templates', data);
    return response.data;
  },

  // Update template
  updateTemplate: async (
    id: string,
    data: {
      template?: string;
      placeholders?: string[];
      order?: number;
      groupId?: string;
    }
  ) => {
    const response = await api.put(`/api/query-templates/${id}`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string) => {
    await api.delete(`/api/query-templates/${id}`);
  },

  // Create group
  createGroup: async (data: {
    name: string;
    description?: string;
    order?: number;
  }) => {
    const response = await api.post('/api/query-templates/groups', data);
    return response.data;
  },

  // Update group
  updateGroup: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      order?: number;
    }
  ) => {
    const response = await api.put(`/api/query-templates/groups/${id}`, data);
    return response.data;
  },

  // Delete group
  deleteGroup: async (id: string) => {
    await api.delete(`/api/query-templates/groups/${id}`);
  },

  // User template selections
  getUserTemplates: async () => {
    const response = await api.get('/api/users/me/query-templates');
    return response.data;
  },

  // Update user template selections
  updateUserTemplates: async (templateIds: string[]) => {
    const response = await api.post('/api/users/me/query-templates', {
      templateIds,
    });
    return response.data;
  },
};

export default api;