import { aiService } from '../ai';

export interface ArtistProfile {
  id: string;
  name: string;
  mediums: string[];
  skills: string[];
  interests: string[];
  experience: string;
  location?: string;
  bio?: string;
}

export interface QueryGenerationOptions {
  maxQueries?: number;
  opportunityType?: 'grants' | 'residencies' | 'exhibitions' | 'all';
  includeLocationSpecific?: boolean;
  temperature?: number;
  bypassCache?: boolean;
}

export interface QueryGenerationResult {
  queries: string[];
  generatedAt: Date;
  profileId: string;
  opportunityType: string;
  processingTimeMs: number;
}

export class QueryGenerationService {
  private cache: Map<string, QueryGenerationResult> = new Map();
  private cacheExpiryMs = 1000 * 60 * 5; // 5 minutes

  async generateQueries(
    profile: ArtistProfile,
    options: QueryGenerationOptions = {}
  ): Promise<QueryGenerationResult> {
    const startTime = Date.now();
    const {
      maxQueries = 8,
      opportunityType = 'all',
      includeLocationSpecific = true,
      temperature = 0.7 + Math.random() * 0.3, // Random temperature between 0.7-1.0 for variety
      bypassCache = false
    } = options;

    const cacheKey = this.getCacheKey(profile, options);
    const cached = this.cache.get(cacheKey);
    
    if (!bypassCache && cached && (Date.now() - cached.generatedAt.getTime()) < this.cacheExpiryMs) {
      return cached;
    }

    try {
      const queries = await aiService.generateQueries(
        this.formatProfileForAI(profile, includeLocationSpecific),
        opportunityType,
        temperature
      );

      const result: QueryGenerationResult = {
        queries: queries.slice(0, maxQueries),
        generatedAt: new Date(),
        profileId: profile.id,
        opportunityType,
        processingTimeMs: Date.now() - startTime
      };

      this.cache.set(cacheKey, result);
      this.cleanupExpiredCache();

      return result;
    } catch (error) {
      throw new Error(`Query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateQueriesForOpportunityType(
    profile: ArtistProfile,
    opportunityType: 'grants' | 'residencies' | 'exhibitions'
  ): Promise<string[]> {
    const result = await this.generateQueries(profile, { opportunityType });
    return result.queries;
  }

  private formatProfileForAI(profile: ArtistProfile, includeLocation: boolean) {
    return {
      name: profile.name,
      mediums: profile.mediums,
      skills: profile.skills,
      interests: profile.interests,
      experience: profile.experience,
      bio: profile.bio,
      ...(includeLocation && profile.location && { location: profile.location })
    };
  }

  private getCacheKey(profile: ArtistProfile, options: QueryGenerationOptions): string {
    const optionsStr = JSON.stringify({
      maxQueries: options.maxQueries,
      opportunityType: options.opportunityType,
      includeLocationSpecific: options.includeLocationSpecific,
      temperature: Math.round((options.temperature || 0.8) * 10) / 10 // Round to 1 decimal for cache grouping
    });
    
    const profileHash = this.hashProfile(profile);
    return `${profileHash}:${optionsStr}`;
  }

  private hashProfile(profile: ArtistProfile): string {
    const profileStr = JSON.stringify({
      mediums: profile.mediums.sort(),
      skills: profile.skills.sort(),
      interests: profile.interests.sort(),
      experience: profile.experience,
      location: profile.location
    });
    
    let hash = 0;
    for (let i = 0; i < profileStr.length; i++) {
      const char = profileStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, result] of this.cache.entries()) {
      if ((now - result.generatedAt.getTime()) >= this.cacheExpiryMs) {
        this.cache.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testProfile: ArtistProfile = {
        id: 'health-check',
        name: 'Test Artist',
        mediums: ['painting'],
        skills: ['drawing'],
        interests: ['contemporary art'],
        experience: 'intermediate'
      };

      await this.generateQueries(testProfile, { maxQueries: 3 });
      return true;
    } catch {
      return false;
    }
  }
}

export const queryGenerationService = new QueryGenerationService();