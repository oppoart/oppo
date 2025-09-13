import { ArtistProfile } from './QueryGeneratorService';
export interface ProfileAnalysis {
    primaryMediums: string[];
    secondaryMediums: string[];
    coreSkills: string[];
    supportingSkills: string[];
    primaryInterests: string[];
    geographicScope: {
        city?: string;
        state?: string;
        country?: string;
        region?: string;
        isRemoteEligible: boolean;
    };
    experienceLevel: {
        category: 'beginner' | 'intermediate' | 'advanced' | 'professional';
        yearsEstimate?: number;
        keywords: string[];
    };
    searchableKeywords: string[];
    excludeKeywords: string[];
    opportunityTypes: string[];
    fundingPreferences: string[];
}
export declare class ProfileAnalyzer {
    private mediumAliases;
    private skillCategories;
    private locationParser;
    constructor();
    /**
     * Analyze an artist profile to extract searchable elements
     */
    analyzeProfile(profile: ArtistProfile): Promise<ProfileAnalysis>;
    /**
     * Analyze and categorize artist mediums
     */
    private analyzeMediums;
    /**
     * Analyze and categorize skills
     */
    private analyzeSkills;
    /**
     * Analyze interests to identify primary areas of focus
     */
    private analyzeInterests;
    /**
     * Analyze experience level from various profile fields
     */
    private analyzeExperienceLevel;
    /**
     * Generate searchable keywords from analysis
     */
    private generateSearchableKeywords;
    /**
     * Determine relevant opportunity types based on profile
     */
    private determineOpportunityTypes;
    /**
     * Determine funding preferences based on profile analysis
     */
    private determineFundingPreferences;
}
