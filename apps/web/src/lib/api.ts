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
    starred?: boolean;
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
    if (options?.starred) params.append('starred', 'true');

    const response = await api.get(`/api/archivist/opportunities?${params}`);
    return response.data;
  },

  // Get specific opportunity by ID
  getOpportunity: async (id: string): Promise<Opportunity> => {
    const response = await api.get(`/api/archivist/opportunities/${id}`);
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

  // Get starred opportunities
  getStarredOpportunities: async (): Promise<Opportunity[]> => {
    const response = await api.get('/api/archivist/opportunities/starred');
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
    const response = await api.post('/api/search/google', { query, ...options });
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
    const response = await api.post('/api/search/google/multiple', { queries, ...options });
    return response.data.data;
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
    const response = await api.post('/api/search/art-opportunities', { query, ...options });
    return response.data.data;
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

export default api;